/**
 * Data Agent - Manages data source plugins and adapters
 *
 * Responsibilities:
 * - Register and manage data source plugins (Wind, JYDB, etc.)
 * - Handle data requests and route to appropriate plugins
 * - Manage real-time data subscriptions
 * - Cache management and data validation
 */

import * as grpc from '@grpc/grpc-js';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino/file',
    options: { destination: 1 }, // stdout
  },
});

const SERVICE_NAME = 'data-agent';
const DEFAULT_PORT = 9302;

/**
 * Data source plugin interface
 */
interface DataSourcePlugin {
  name: string;
  version: string;
  supportedDataTypes: string[];
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  fetchQuote(symbols: string[]): Promise<Quote[]>;
  fetchOhlcv(symbol: string, startDate: string, endDate: string): Promise<OhlcvBar[]>;
  subscribe(symbols: string[], callback: (quote: Quote) => void): void;
  unsubscribe(symbols: string[]): void;
}

/**
 * Quote data structure
 */
interface Quote {
  symbol: string;
  timestamp: Date;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
}

/**
 * OHLCV bar data structure
 */
interface OhlcvBar {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
}

/**
 * Plugin registry
 */
class PluginRegistry {
  private plugins: Map<string, DataSourcePlugin> = new Map();

  register(plugin: DataSourcePlugin): void {
    logger.info({ plugin: plugin.name, version: plugin.version }, 'Registering data source plugin');
    this.plugins.set(plugin.name, plugin);
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.disconnect().catch((err) => {
        logger.error({ error: err, plugin: name }, 'Error disconnecting plugin');
      });
      this.plugins.delete(name);
      logger.info({ plugin: name }, 'Unregistered data source plugin');
    }
  }

  get(name: string): DataSourcePlugin | undefined {
    return this.plugins.get(name);
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  async connectAll(): Promise<void> {
    const promises = Array.from(this.plugins.values()).map((plugin) =>
      plugin.connect().catch((err) => {
        logger.error({ error: err, plugin: plugin.name }, 'Failed to connect plugin');
      })
    );
    await Promise.all(promises);
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.plugins.values()).map((plugin) =>
      plugin.disconnect().catch((err) => {
        logger.error({ error: err, plugin: plugin.name }, 'Error disconnecting plugin');
      })
    );
    await Promise.all(promises);
  }
}

/**
 * Data Agent service
 */
class DataAgentService {
  private registry: PluginRegistry;

  constructor() {
    this.registry = new PluginRegistry();
  }

  getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Fetch quotes from the best available data source
   */
  async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    const plugins = this.registry.list();
    
    for (const pluginName of plugins) {
      const plugin = this.registry.get(pluginName);
      if (plugin && plugin.isConnected()) {
        try {
          return await plugin.fetchQuote(symbols);
        } catch (err) {
          logger.warn({ error: err, plugin: pluginName }, 'Failed to fetch quotes, trying next plugin');
        }
      }
    }

    throw new Error('No available data source');
  }

  /**
   * Fetch OHLCV data from the best available data source
   */
  async fetchOhlcv(symbol: string, startDate: string, endDate: string): Promise<OhlcvBar[]> {
    const plugins = this.registry.list();
    
    for (const pluginName of plugins) {
      const plugin = this.registry.get(pluginName);
      if (plugin && plugin.isConnected()) {
        try {
          return await plugin.fetchOhlcv(symbol, startDate, endDate);
        } catch (err) {
          logger.warn({ error: err, plugin: pluginName }, 'Failed to fetch OHLCV, trying next plugin');
        }
      }
    }

    throw new Error('No available data source');
  }
}

async function main(): Promise<void> {
  const port = parseInt(process.env.SERVICE_PORT || String(DEFAULT_PORT), 10);

  const service = new DataAgentService();
  const server = new grpc.Server();

  // TODO: Add gRPC service implementations
  // server.addService(DataAgentService, dataAgentImpl);

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

      // Connect all registered plugins
      service.getRegistry().connectAll().then(() => {
        logger.info('All data source plugins connected');
      }).catch((err) => {
        logger.error({ error: err }, 'Failed to connect some plugins');
      });
    }
  );

  // Handle shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down server...');
    
    // Disconnect all plugins
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

export { DataAgentService, PluginRegistry, DataSourcePlugin, Quote, OhlcvBar };
