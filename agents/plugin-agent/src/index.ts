/**
 * Plugin Agent - Manages plugin lifecycle and registration
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

const SERVICE_NAME = 'plugin-agent';
const DEFAULT_PORT = 9301;

async function main(): Promise<void> {
  const port = parseInt(process.env.SERVICE_PORT || String(DEFAULT_PORT), 10);

  const server = new grpc.Server();

  // TODO: Add service implementations
  // server.addService(PluginAgentService, pluginAgentImpl);

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
    }
  );

  // Handle shutdown
  const shutdown = (): void => {
    logger.info('Shutting down server...');
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
