/**
 * Trade Agent - Manages trading channel plugins and order execution
 *
 * Responsibilities:
 * - Register and manage trading channel plugins (宣夜, 仁睿, 金欣, etc.)
 * - Route orders to appropriate trading channels
 * - Handle order lifecycle (submit, cancel, amend)
 * - Manage execution reports and fills
 * - Position and balance synchronization
 */

import * as grpc from '@grpc/grpc-js';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino/file',
    options: { destination: 1 }, // stdout
  },
});

const SERVICE_NAME = 'trade-agent';
const DEFAULT_PORT = 9303;

/**
 * Order side
 */
type OrderSide = 'buy' | 'sell';

/**
 * Order type
 */
type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

/**
 * Order status
 */
type OrderStatus = 
  | 'pending'
  | 'submitted'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';

/**
 * Order request
 */
interface OrderRequest {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
  accountId: string;
  clientOrderId?: string;
}

/**
 * Order response
 */
interface Order {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  filledQuantity: number;
  avgFillPrice: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  accountId: string;
  channel: string;
}

/**
 * Execution report (fill)
 */
interface ExecutionReport {
  execId: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number;
  executedAt: Date;
}

/**
 * Position
 */
interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  marketValue: number;
  unrealizedPnl: number;
  accountId: string;
}

/**
 * Trading channel plugin interface
 */
interface TradingChannelPlugin {
  name: string;
  version: string;
  supportedMarkets: string[];
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  submitOrder(request: OrderRequest): Promise<Order>;
  cancelOrder(orderId: string): Promise<boolean>;
  amendOrder(orderId: string, quantity?: number, price?: number): Promise<Order>;
  getOrder(orderId: string): Promise<Order | null>;
  getOpenOrders(accountId: string): Promise<Order[]>;
  getPositions(accountId: string): Promise<Position[]>;
  getBalance(accountId: string): Promise<{ cash: number; equity: number }>;
  onExecutionReport(callback: (report: ExecutionReport) => void): void;
}

/**
 * Plugin registry for trading channels
 */
class TradingChannelRegistry {
  private channels: Map<string, TradingChannelPlugin> = new Map();

  register(plugin: TradingChannelPlugin): void {
    logger.info({ channel: plugin.name, version: plugin.version }, 'Registering trading channel');
    this.channels.set(plugin.name, plugin);
  }

  unregister(name: string): void {
    const plugin = this.channels.get(name);
    if (plugin) {
      plugin.disconnect().catch((err) => {
        logger.error({ error: err, channel: name }, 'Error disconnecting channel');
      });
      this.channels.delete(name);
      logger.info({ channel: name }, 'Unregistered trading channel');
    }
  }

  get(name: string): TradingChannelPlugin | undefined {
    return this.channels.get(name);
  }

  list(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Get the best channel for a given market
   */
  getChannelForMarket(market: string): TradingChannelPlugin | undefined {
    for (const channel of this.channels.values()) {
      if (channel.isConnected() && channel.supportedMarkets.includes(market)) {
        return channel;
      }
    }
    return undefined;
  }

  async connectAll(): Promise<void> {
    const promises = Array.from(this.channels.values()).map((channel) =>
      channel.connect().catch((err) => {
        logger.error({ error: err, channel: channel.name }, 'Failed to connect channel');
      })
    );
    await Promise.all(promises);
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.channels.values()).map((channel) =>
      channel.disconnect().catch((err) => {
        logger.error({ error: err, channel: channel.name }, 'Error disconnecting channel');
      })
    );
    await Promise.all(promises);
  }
}

/**
 * Order manager
 */
class OrderManager {
  private orders: Map<string, Order> = new Map();
  private registry: TradingChannelRegistry;

  constructor(registry: TradingChannelRegistry) {
    this.registry = registry;
  }

  /**
   * Submit an order to the appropriate trading channel
   */
  async submitOrder(request: OrderRequest, channelName?: string): Promise<Order> {
    const clientOrderId = request.clientOrderId || uuidv4();

    // Determine market from symbol (e.g., "000001.SZ" -> "SZ")
    const market = this.extractMarket(request.symbol);

    // Find appropriate channel
    let channel: TradingChannelPlugin | undefined;
    if (channelName) {
      channel = this.registry.get(channelName);
    } else {
      channel = this.registry.getChannelForMarket(market);
    }

    if (!channel || !channel.isConnected()) {
      throw new Error(`No available trading channel for market ${market}`);
    }

    logger.info({
      symbol: request.symbol,
      side: request.side,
      quantity: request.quantity,
      channel: channel.name,
    }, 'Submitting order');

    const order = await channel.submitOrder({
      ...request,
      clientOrderId,
    });

    this.orders.set(order.orderId, order);
    return order;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const channel = this.registry.get(order.channel);
    if (!channel) {
      throw new Error(`Channel not found: ${order.channel}`);
    }

    const result = await channel.cancelOrder(orderId);
    if (result) {
      order.status = 'cancelled';
      order.updatedAt = new Date();
    }
    return result;
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Extract market from symbol
   */
  private extractMarket(symbol: string): string {
    const parts = symbol.split('.');
    return parts.length > 1 ? parts[1] : 'unknown';
  }
}

/**
 * Trade Agent service
 */
class TradeAgentService {
  private registry: TradingChannelRegistry;
  private orderManager: OrderManager;

  constructor() {
    this.registry = new TradingChannelRegistry();
    this.orderManager = new OrderManager(this.registry);
  }

  getRegistry(): TradingChannelRegistry {
    return this.registry;
  }

  getOrderManager(): OrderManager {
    return this.orderManager;
  }
}

async function main(): Promise<void> {
  const port = parseInt(process.env.SERVICE_PORT || String(DEFAULT_PORT), 10);

  const service = new TradeAgentService();
  const server = new grpc.Server();

  // TODO: Add gRPC service implementations
  // server.addService(TradeAgentService, tradeAgentImpl);

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        logger.error({ error }, 'Failed to bind server');
        process.exit(1);
      }

      logger.info({ service: SERVICE_NAME, port: boundPort }, 'Starting gRPC server');
      server.start();

      // Connect all registered channels
      service.getRegistry().connectAll().then(() => {
        logger.info('All trading channels connected');
      }).catch((err) => {
        logger.error({ error: err }, 'Failed to connect some channels');
      });
    }
  );

  // Handle shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down server...');
    
    // Disconnect all channels
    await service.getRegistry().disconnectAll();

    server.tryShutdown((error) => {
      if (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
      logger.info('Server stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error');
  process.exit(1);
});

export {
  TradeAgentService,
  TradingChannelRegistry,
  TradingChannelPlugin,
  OrderManager,
  Order,
  OrderRequest,
  OrderSide,
  OrderType,
  OrderStatus,
  ExecutionReport,
  Position,
};
