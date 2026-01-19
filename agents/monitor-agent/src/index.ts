/**
 * Monitor Agent - System health monitoring and alerting
 *
 * Responsibilities:
 * - Monitor service health and availability
 * - Collect system metrics (CPU, memory, disk)
 * - Track service latencies and error rates
 * - Generate alerts for anomalies
 * - Provide health check endpoints
 */

import * as grpc from '@grpc/grpc-js';
import pino from 'pino';
import axios from 'axios';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino/file',
    options: { destination: 1 }, // stdout
  },
});

const SERVICE_NAME = 'monitor-agent';
const DEFAULT_PORT = 9304;

/**
 * Health status
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Service health info
 */
interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latency: number; // ms
  lastCheck: Date;
  errorCount: number;
  message?: string;
}

/**
 * System metrics
 */
interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number; // percentage
    cores: number;
  };
  memory: {
    total: number; // bytes
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
}

/**
 * Alert severity
 */
type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert
 */
interface Alert {
  id: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Monitored service configuration
 */
interface ServiceConfig {
  name: string;
  host: string;
  port: number;
  healthEndpoint?: string;
  checkInterval: number; // ms
  timeout: number; // ms
}

/**
 * Alert rule
 */
interface AlertRule {
  name: string;
  condition: (metrics: SystemMetrics, services: ServiceHealth[]) => boolean;
  severity: AlertSeverity;
  message: string;
  cooldown: number; // ms - minimum time between alerts
}

/**
 * Health checker for a single service
 */
class ServiceHealthChecker {
  private config: ServiceConfig;
  private health: ServiceHealth;
  private intervalId?: NodeJS.Timeout;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.health = {
      name: config.name,
      status: 'unknown',
      latency: 0,
      lastCheck: new Date(0),
      errorCount: 0,
    };
  }

  getHealth(): ServiceHealth {
    return { ...this.health };
  }

  start(): void {
    this.check(); // Initial check
    this.intervalId = setInterval(() => this.check(), this.config.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async check(): Promise<void> {
    const startTime = Date.now();
    const url = this.config.healthEndpoint
      ? `http://${this.config.host}:${this.config.port}${this.config.healthEndpoint}`
      : `http://${this.config.host}:${this.config.port}/health`;

    try {
      const response = await axios.get(url, {
        timeout: this.config.timeout,
      });

      const latency = Date.now() - startTime;
      this.health = {
        name: this.config.name,
        status: response.status === 200 ? 'healthy' : 'degraded',
        latency,
        lastCheck: new Date(),
        errorCount: 0,
        message: response.data?.message,
      };

      logger.debug({
        service: this.config.name,
        status: this.health.status,
        latency,
      }, 'Health check completed');
    } catch (error) {
      const latency = Date.now() - startTime;
      this.health.errorCount++;
      this.health.latency = latency;
      this.health.lastCheck = new Date();
      this.health.status = this.health.errorCount >= 3 ? 'unhealthy' : 'degraded';
      this.health.message = error instanceof Error ? error.message : 'Unknown error';

      logger.warn({
        service: this.config.name,
        status: this.health.status,
        errorCount: this.health.errorCount,
        error: this.health.message,
      }, 'Health check failed');
    }
  }
}

/**
 * System metrics collector
 */
class MetricsCollector {
  private lastMetrics: SystemMetrics | null = null;
  private intervalId?: NodeJS.Timeout;

  constructor(private collectInterval: number = 5000) {}

  getMetrics(): SystemMetrics | null {
    return this.lastMetrics;
  }

  start(): void {
    this.collect(); // Initial collection
    this.intervalId = setInterval(() => this.collect(), this.collectInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async collect(): Promise<void> {
    try {
      // Dynamic import for systeminformation (heavy module)
      const si = await import('systeminformation');

      const [cpu, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
      ]);

      const primaryDisk = disk[0] || { size: 0, used: 0, available: 0, use: 0 };

      this.lastMetrics = {
        timestamp: new Date(),
        cpu: {
          usage: cpu.currentLoad,
          cores: cpu.cpus.length,
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usagePercent: (mem.used / mem.total) * 100,
        },
        disk: {
          total: primaryDisk.size,
          used: primaryDisk.used,
          free: primaryDisk.available,
          usagePercent: primaryDisk.use,
        },
      };

      logger.debug({
        cpuUsage: this.lastMetrics.cpu.usage.toFixed(1),
        memUsage: this.lastMetrics.memory.usagePercent.toFixed(1),
        diskUsage: this.lastMetrics.disk.usagePercent.toFixed(1),
      }, 'Metrics collected');
    } catch (error) {
      logger.error({ error }, 'Failed to collect metrics');
    }
  }
}

/**
 * Alert manager
 */
class AlertManager {
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private alertIdCounter = 0;

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    logger.info({ ruleName: rule.name }, 'Added alert rule');
  }

  removeRule(name: string): void {
    this.rules = this.rules.filter((r) => r.name !== name);
  }

  evaluate(metrics: SystemMetrics | null, services: ServiceHealth[]): Alert[] {
    const newAlerts: Alert[] = [];

    if (!metrics) return newAlerts;

    for (const rule of this.rules) {
      const lastTime = this.lastAlertTime.get(rule.name) || 0;
      const now = Date.now();

      if (now - lastTime < rule.cooldown) {
        continue; // Still in cooldown
      }

      try {
        if (rule.condition(metrics, services)) {
          const alert: Alert = {
            id: `alert-${++this.alertIdCounter}`,
            severity: rule.severity,
            source: rule.name,
            message: rule.message,
            timestamp: new Date(),
            acknowledged: false,
          };

          this.alerts.push(alert);
          newAlerts.push(alert);
          this.lastAlertTime.set(rule.name, now);

          logger.warn({
            alertId: alert.id,
            severity: alert.severity,
            source: alert.source,
            message: alert.message,
          }, 'Alert triggered');
        }
      } catch (error) {
        logger.error({ error, rule: rule.name }, 'Error evaluating alert rule');
      }
    }

    return newAlerts;
  }

  getAlerts(unacknowledgedOnly = false): Alert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter((a) => !a.acknowledged);
    }
    return [...this.alerts];
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}

/**
 * Monitor Agent service
 */
class MonitorAgentService {
  private healthCheckers: Map<string, ServiceHealthChecker> = new Map();
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private evaluationInterval?: NodeJS.Timeout;

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();

    // Add default alert rules
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    // High CPU usage
    this.alertManager.addRule({
      name: 'high_cpu',
      condition: (metrics) => metrics.cpu.usage > 90,
      severity: 'warning',
      message: 'CPU usage above 90%',
      cooldown: 300000, // 5 minutes
    });

    // High memory usage
    this.alertManager.addRule({
      name: 'high_memory',
      condition: (metrics) => metrics.memory.usagePercent > 90,
      severity: 'warning',
      message: 'Memory usage above 90%',
      cooldown: 300000,
    });

    // High disk usage
    this.alertManager.addRule({
      name: 'high_disk',
      condition: (metrics) => metrics.disk.usagePercent > 90,
      severity: 'warning',
      message: 'Disk usage above 90%',
      cooldown: 3600000, // 1 hour
    });

    // Service unhealthy
    this.alertManager.addRule({
      name: 'service_unhealthy',
      condition: (_, services) => services.some((s) => s.status === 'unhealthy'),
      severity: 'error',
      message: 'One or more services are unhealthy',
      cooldown: 60000, // 1 minute
    });
  }

  addService(config: ServiceConfig): void {
    const checker = new ServiceHealthChecker(config);
    this.healthCheckers.set(config.name, checker);
    checker.start();
    logger.info({ service: config.name }, 'Added service to monitoring');
  }

  removeService(name: string): void {
    const checker = this.healthCheckers.get(name);
    if (checker) {
      checker.stop();
      this.healthCheckers.delete(name);
      logger.info({ service: name }, 'Removed service from monitoring');
    }
  }

  getServiceHealth(name: string): ServiceHealth | undefined {
    return this.healthCheckers.get(name)?.getHealth();
  }

  getAllServiceHealth(): ServiceHealth[] {
    return Array.from(this.healthCheckers.values()).map((c) => c.getHealth());
  }

  getSystemMetrics(): SystemMetrics | null {
    return this.metricsCollector.getMetrics();
  }

  getAlerts(unacknowledgedOnly = false): Alert[] {
    return this.alertManager.getAlerts(unacknowledgedOnly);
  }

  start(): void {
    this.metricsCollector.start();

    // Start alert evaluation loop
    this.evaluationInterval = setInterval(() => {
      const metrics = this.metricsCollector.getMetrics();
      const services = this.getAllServiceHealth();
      this.alertManager.evaluate(metrics, services);
    }, 10000); // Evaluate every 10 seconds

    logger.info('Monitor agent started');
  }

  stop(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }

    this.metricsCollector.stop();
    for (const checker of this.healthCheckers.values()) {
      checker.stop();
    }

    logger.info('Monitor agent stopped');
  }
}

async function main(): Promise<void> {
  const port = parseInt(process.env.SERVICE_PORT || String(DEFAULT_PORT), 10);

  const service = new MonitorAgentService();
  const server = new grpc.Server();

  // TODO: Add gRPC service implementations
  // server.addService(MonitorAgentService, monitorAgentImpl);

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

      // Start monitoring
      service.start();

      // Add default services to monitor
      const defaultServices: ServiceConfig[] = [
        { name: 'gateway', host: 'localhost', port: 8080, checkInterval: 30000, timeout: 5000 },
        { name: 'account', host: 'localhost', port: 9001, checkInterval: 30000, timeout: 5000 },
        { name: 'order', host: 'localhost', port: 9002, checkInterval: 30000, timeout: 5000 },
        { name: 'position', host: 'localhost', port: 9003, checkInterval: 30000, timeout: 5000 },
        { name: 'trade', host: 'localhost', port: 9004, checkInterval: 30000, timeout: 5000 },
        { name: 'data', host: 'localhost', port: 9005, checkInterval: 30000, timeout: 5000 },
      ];

      for (const config of defaultServices) {
        service.addService(config);
      }
    }
  );

  // Handle shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down server...');
    
    service.stop();

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
  MonitorAgentService,
  ServiceHealthChecker,
  MetricsCollector,
  AlertManager,
  ServiceHealth,
  SystemMetrics,
  Alert,
  AlertSeverity,
  ServiceConfig,
  AlertRule,
};
