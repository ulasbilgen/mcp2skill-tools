#!/usr/bin/env node

/**
 * Pure server entry point for mcp2rest
 *
 * This file contains only server startup logic without CLI or PID file management.
 * Used by PM2 and other process managers for running mcp2rest as a service.
 */

import { ConfigManager } from '../config/ConfigManager';
import { Gateway } from '../gateway/Gateway';
import { APIServer } from '../api/APIServer';

/**
 * Start the mcp2rest server
 * @param configPath Optional path to custom config file
 * @param cliPort Optional port from CLI (highest priority)
 * @param cliHost Optional host from CLI (highest priority)
 */
export async function startServer(
  configPath?: string,
  cliPort?: number,
  cliHost?: string
): Promise<{ gateway: Gateway; apiServer: APIServer }> {
  console.log('Starting MCP Gateway...');

  // Create ConfigManager with optional custom config path
  const configManager = new ConfigManager(configPath);

  // Create Gateway instance
  const gateway = new Gateway(configManager);

  // Initialize gateway and connect to all configured servers
  await gateway.initialize();

  // Get configuration to determine port and host
  const config = await configManager.load();

  // Port precedence: CLI flag > Environment variable > Config file > Default
  const port = cliPort
    || (process.env.MCP2REST_PORT ? parseInt(process.env.MCP2REST_PORT, 10) : undefined)
    || config.gateway.port;

  // Host precedence: CLI flag > Environment variable > Config file > Default
  const host = cliHost
    || process.env.MCP2REST_HOST
    || config.gateway.host;

  // Create and start API server
  const apiServer = new APIServer(gateway);
  await apiServer.start(port, host);

  console.log(`Gateway started on ${host}:${port}`);

  // Setup graceful shutdown handlers
  const shutdown = async () => {
    console.log('\nShutting down...');
    await apiServer.stop();
    await gateway.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { gateway, apiServer };
}

// If run directly (not imported), start the server
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
