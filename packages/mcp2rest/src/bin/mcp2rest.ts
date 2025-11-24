#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { readFileSync } from 'fs';
import { ConfigManager } from '../config/ConfigManager.js';
import { startServer } from './server.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Read version from package.json (relative to dist/bin/)
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('mcp2rest')
  .description('A standalone Node.js daemon that manages multiple MCP servers and exposes their tools via REST API')
  .version(packageJson.version);

// Start command - starts the gateway daemon
program
  .command('start')
  .description('Start the MCP Gateway daemon')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-p, --port <number>', 'Port to listen on (overrides config and env)', parseInt)
  .option('-H, --host <string>', 'Host to bind to (overrides config and env)')
  .action(async (options) => {
    try {
      // Check if PM2 service is already running (skip check if running under PM2)
      if (!process.env.PM2_HOME) {
        try {
          const { stdout } = await execAsync('npx pm2 describe mcp2rest');
          if (stdout.includes('online')) {
            console.log('⚠️  Warning: MCP Gateway is already running as a PM2 service');
            console.log('Use "mcp2rest service status" to check the service status');
            console.log('Use "mcp2rest service uninstall" to remove the service before starting in foreground mode');
            process.exit(1);
          }
        } catch (error) {
          // Service not found or not running, continue with foreground start
        }
      }

      // Start the server using the shared server entry point
      const { gateway, apiServer } = await startServer(options.config, options.port, options.host);

      // Write PID file for foreground mode process management
      const configDir = path.join(os.homedir(), '.mcp2rest');
      const pidFile = path.join(configDir, 'gateway.pid');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(pidFile, process.pid.toString(), 'utf-8');

      // Enhanced shutdown handler for foreground mode (removes PID file)
      const shutdown = async () => {
        console.log('\nShutting down...');

        // Remove PID file
        try {
          await fs.unlink(pidFile);
        } catch (error) {
          // Ignore error if file doesn't exist
        }

        await apiServer.stop();
        await gateway.shutdown();
        process.exit(0);
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
      
    } catch (error: any) {
      console.error('Failed to start gateway:', error.message);
      process.exit(1);
    }
  });

// Stop command - stops the gateway daemon
program
  .command('stop')
  .description('Stop the MCP Gateway daemon')
  .action(async () => {
    try {
      console.log('Stopping MCP Gateway...');
      
      // First check if running as PM2 service
      let stoppedPM2 = false;
      try {
        const { stdout } = await execAsync('npx pm2 describe mcp2rest');
        if (stdout.includes('online')) {
          console.log('Detected PM2 service, stopping...');
          await execAsync('npx pm2 stop mcp2rest');
          console.log('✓ PM2 service stopped successfully');
          console.log('Note: Service will restart automatically. Use "mcp2rest service uninstall" to remove it permanently.');
          stoppedPM2 = true;
        }
      } catch (error) {
        // Not running as PM2 service, continue with PID file approach
      }
      
      // If not stopped via PM2, try PID file approach
      if (!stoppedPM2) {
        // Get PID file path
        const configDir = path.join(os.homedir(), '.mcp2rest');
        const pidFile = path.join(configDir, 'gateway.pid');
        
        // Check if PID file exists
        try {
          await fs.access(pidFile);
        } catch (error) {
          console.log('Gateway is not running (PID file not found)');
          process.exit(0);
        }
        
        // Read PID from file
        const pidContent = await fs.readFile(pidFile, 'utf-8');
        const pid = parseInt(pidContent.trim(), 10);
        
        if (isNaN(pid)) {
          console.error('Invalid PID in file');
          process.exit(1);
        }
        
        // Send SIGTERM to the process
        try {
          process.kill(pid, 'SIGTERM');
          console.log(`Sent SIGTERM to process ${pid}`);
          
          // Wait a moment and check if process is still running
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            // Check if process is still alive (will throw if not)
            process.kill(pid, 0);
            console.log('Gateway is shutting down...');
          } catch (error) {
            console.log('Gateway stopped successfully');
          }
          
          // Remove PID file
          try {
            await fs.unlink(pidFile);
          } catch (error) {
            // Ignore error if file already removed
          }
          
        } catch (error: any) {
          if (error.code === 'ESRCH') {
            console.log('Gateway process not found (already stopped)');
            // Clean up stale PID file
            await fs.unlink(pidFile);
          } else {
            throw error;
          }
        }
      }
      
    } catch (error: any) {
      console.error('Failed to stop gateway:', error.message);
      process.exit(1);
    }
  });

// Service command group
const service = program
  .command('service')
  .description('Manage MCP Gateway as a system service');

// Service install command
service
  .command('install')
  .description('Install MCP Gateway as a system service using PM2')
  .action(async () => {
    try {
      console.log('Installing MCP Gateway service...');
      
      // Ensure logs directory exists
      const configDir = path.join(os.homedir(), '.mcp2rest');
      const logsDir = path.join(configDir, 'logs');
      await fs.mkdir(logsDir, { recursive: true });

      // Load current configuration to get port and host settings
      const configManager = new ConfigManager();
      const config = await configManager.load();

      // Generate PM2 ecosystem config dynamically
      console.log('Generating PM2 configuration...');

      // Get absolute path to mcp2rest binary, then derive server.js path
      const { stdout: mcpPath } = await execAsync('which mcp2rest');
      const mcpBinaryPathSymlink = mcpPath.trim();

      // Resolve symlinks to get the real path (important for npm link)
      const mcpBinaryPath = await fs.realpath(mcpBinaryPathSymlink);

      // server.js is in the same directory as mcp2rest binary
      const serverPath = path.join(path.dirname(mcpBinaryPath), 'server.js');

      const ecosystemConfig = {
        apps: [{
          name: 'mcp2rest',
          script: serverPath,  // Use absolute path to server.js (no CLI overhead)
          args: '',  // No args needed - server.js starts directly
          exec_mode: 'fork',  // Use fork mode, not cluster
          instances: 1,
          autorestart: true,
          watch: false,
          max_memory_restart: '500M',
          env: {
            NODE_ENV: 'production',
            MCP2REST_PORT: config.gateway.port.toString(),
            MCP2REST_HOST: config.gateway.host
          },
          error_file: path.join(logsDir, 'error.log'),
          out_file: path.join(logsDir, 'out.log'),
          log_file: path.join(logsDir, 'combined.log'),
          time: true,
          merge_logs: true,
          log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        }]
      };

      // Write ecosystem file to ~/.mcp2rest/
      const ecosystemPath = path.join(configDir, 'pm2.ecosystem.config.js');
      const ecosystemContent = `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`;
      await fs.writeFile(ecosystemPath, ecosystemContent, 'utf-8');
      console.log(`✓ PM2 configuration written to ${ecosystemPath}`);

      // Start the gateway with PM2 using generated config
      console.log('Starting gateway with PM2...');
      const { stdout: startOutput } = await execAsync(`npx pm2 start "${ecosystemPath}"`);
      console.log(startOutput);
      
      // Save PM2 process list
      console.log('Saving PM2 process list...');
      await execAsync('npx pm2 save');
      
      // Setup PM2 startup script (optional, may require sudo)
      console.log('Configuring auto-start on boot...');
      try {
        const { stdout: startupOutput } = await execAsync('npx pm2 startup');
        console.log(startupOutput);
      } catch (error: any) {
        console.log('⚠️  Note: Auto-start on boot requires additional setup.');
        console.log('Run "pm2 startup" manually and follow the instructions if you want the gateway to start on boot.');
      }
      
      // Get service status
      const { stdout: statusOutput } = await execAsync('npx pm2 describe mcp2rest');
      
      console.log('\n✓ MCP Gateway service installed successfully!');
      console.log('\nService Status:');
      console.log(statusOutput);
      console.log('\nUse "mcp2rest service status" to check the service status.');
      
    } catch (error: any) {
      console.error('✗ Failed to install service:', error.message);
      if (error.stderr) {
        console.error(error.stderr);
      }
      process.exit(1);
    }
  });

// Service uninstall command
service
  .command('uninstall')
  .description('Uninstall MCP Gateway service from PM2')
  .action(async () => {
    try {
      console.log('Uninstalling MCP Gateway service...');
      
      // Check if the service exists
      try {
        await execAsync('npx pm2 describe mcp2rest');
      } catch (error) {
        console.log('✓ MCP Gateway service is not installed');
        process.exit(0);
      }
      
      // Stop the gateway process
      console.log('Stopping gateway process...');
      try {
        await execAsync('npx pm2 stop mcp2rest');
      } catch (error) {
        // Process might already be stopped, continue
      }
      
      // Delete from PM2 process list
      console.log('Removing from PM2...');
      await execAsync('npx pm2 delete mcp2rest');
      
      // Save PM2 process list
      await execAsync('npx pm2 save');

      // Clean up generated ecosystem file
      try {
        const configDir = path.join(os.homedir(), '.mcp2rest');
        const ecosystemPath = path.join(configDir, 'pm2.ecosystem.config.js');
        await fs.unlink(ecosystemPath);
        console.log('✓ Cleaned up PM2 configuration file');
      } catch (error) {
        // Ignore if file doesn't exist
      }

      console.log('\n✓ MCP Gateway service uninstalled successfully!');
      console.log('The gateway will no longer start automatically on boot.');
      
    } catch (error: any) {
      console.error('✗ Failed to uninstall service:', error.message);
      if (error.stderr) {
        console.error(error.stderr);
      }
      process.exit(1);
    }
  });

// Service status command
service
  .command('status')
  .description('Check MCP Gateway service status')
  .action(async () => {
    try {
      // Get configuration to determine API port and host
      const configManager = new ConfigManager();
      const config = await configManager.load();

      // Port precedence: Environment variable > Config file > Default
      const port = process.env.MCP2REST_PORT
        ? parseInt(process.env.MCP2REST_PORT, 10)
        : config.gateway.port;

      // Host precedence: Environment variable > Config file > Default
      const host = process.env.MCP2REST_HOST || config.gateway.host;

      // Check if service is running via HTTP health check
      let apiStatus = 'offline';
      let serverCount = 0;
      let connectedServers = 0;

      try {
        const response = await fetch(`http://${host}:${port}/health`);
        if (response.ok) {
          const healthData = await response.json() as any;
          apiStatus = healthData.status === 'ok' ? 'online' : 'degraded';
          serverCount = healthData.serverCount || 0;
          connectedServers = healthData.connectedServers || 0;
        }
      } catch (error) {
        // Health check failed - service is offline or not responding
        apiStatus = 'offline';
      }

      // Get process info from PM2
      let uptime = 'N/A';
      let memory = 'N/A';
      let cpu = 'N/A';
      let restarts = 'N/A';

      try {
        const { stdout } = await execAsync('npx pm2 describe mcp2rest');
        const lines = stdout.split('\n');

        for (const line of lines) {
          if (line.includes('uptime')) {
            const match = line.match(/│\s*uptime\s*│\s*(.+?)\s*│/);
            if (match) uptime = match[1].trim();
          } else if (line.includes('memory')) {
            const match = line.match(/│\s*memory\s*│\s*(.+?)\s*│/);
            if (match) memory = match[1].trim();
          } else if (line.includes('cpu')) {
            const match = line.match(/│\s*cpu\s*│\s*(.+?)\s*│/);
            if (match) cpu = match[1].trim();
          } else if (line.includes('restarts')) {
            const match = line.match(/│\s*restarts\s*│\s*(\d+)\s*│/);
            if (match) restarts = match[1];
          }
        }
      } catch (error) {
        // PM2 process not found - will be handled below
      }

      console.log('\nMCP Gateway Service Status:');
      console.log('═══════════════════════════════════════');
      console.log(`Status:   ${apiStatus === 'online' ? '🟢' : '🔴'} ${apiStatus}`);
      console.log(`API:      http://${host}:${port}`);
      console.log(`Servers:  ${connectedServers}/${serverCount}`);
      console.log(`Uptime:   ${uptime}`);
      console.log(`Memory:   ${memory}`);
      console.log(`CPU:      ${cpu}`);
      console.log(`Restarts: ${restarts}`);
      console.log('═══════════════════════════════════════\n');

      // Exit with error if service is offline
      if (apiStatus === 'offline') {
        process.exit(1);
      }

    } catch (error: any) {
      if (error.message.includes('not found') || error.stderr?.includes('not found') || error.stderr?.includes("doesn't exist")) {
        console.log('\n✗ MCP Gateway service is not installed');
        console.log('Install it with: mcp2rest service install\n');
      } else {
        console.error('✗ Failed to get service status:', error.message);
        if (error.stderr) {
          console.error(error.stderr);
        }
      }
      process.exit(1);
    }
  });

// Service logs command
service
  .command('logs')
  .description('View MCP Gateway service logs')
  .option('-n, --lines <number>', 'Number of lines to display', '100')
  .option('-f, --follow', 'Follow log output in real-time')
  .action(async (options) => {
    try {
      // Check if service exists
      try {
        await execAsync('npx pm2 describe mcp2rest');
      } catch (error) {
        console.log('✗ MCP Gateway service is not installed');
        console.log('Install it with: mcp2rest service install');
        process.exit(1);
      }
      
      // Build PM2 logs command
      let logsCommand = 'npx pm2 logs mcp2rest';
      
      if (options.follow) {
        // For follow mode, use spawn to stream output
        const { spawn } = await import('child_process');
        const logsProcess = spawn('npx', ['pm2', 'logs', 'mcp2rest', '--lines', options.lines], {
          stdio: 'inherit'
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
          logsProcess.kill();
          process.exit(0);
        });
        
        logsProcess.on('exit', (code) => {
          process.exit(code || 0);
        });
      } else {
        // For non-follow mode, just display the logs
        logsCommand += ` --lines ${options.lines} --nostream`;
        const { stdout } = await execAsync(logsCommand);
        console.log(stdout);
      }
      
    } catch (error: any) {
      console.error('✗ Failed to retrieve logs:', error.message);
      if (error.stderr) {
        console.error(error.stderr);
      }
      process.exit(1);
    }
  });

// Service stop command
service
  .command('stop')
  .description('Stop MCP Gateway service')
  .action(async () => {
    try {
      // Check if service exists
      try {
        await execAsync('npx pm2 describe mcp2rest');
      } catch (error) {
        console.log('✗ MCP Gateway service is not installed');
        console.log('Install it with: mcp2rest service install');
        process.exit(1);
      }

      // Stop the service
      await execAsync('npx pm2 stop mcp2rest');
      console.log('✓ MCP Gateway service stopped');
      console.log('\nNote: PM2 will auto-restart the service.');
      console.log('Use "mcp2rest service uninstall" to remove permanently.\n');

    } catch (error: any) {
      console.error('✗ Failed to stop service:', error.message);
      if (error.stderr) {
        console.error(error.stderr);
      }
      process.exit(1);
    }
  });

// Service restart command
service
  .command('restart')
  .description('Restart MCP Gateway service')
  .action(async () => {
    try {
      // Check if service exists
      try {
        await execAsync('npx pm2 describe mcp2rest');
      } catch (error) {
        console.log('✗ MCP Gateway service is not installed');
        console.log('Install it with: mcp2rest service install');
        process.exit(1);
      }

      // Restart the service
      console.log('Restarting MCP Gateway service...');
      await execAsync('npx pm2 restart mcp2rest');
      console.log('✓ MCP Gateway service restarted successfully\n');

    } catch (error: any) {
      console.error('✗ Failed to restart service:', error.message);
      if (error.stderr) {
        console.error(error.stderr);
      }
      process.exit(1);
    }
  });

// Add command - adds a new MCP server
program
  .command('add <name> <package-or-url>')
  .description('Add a new MCP server to the gateway')
  .option('-t, --transport <type>', 'Transport type: stdio or http (auto-detected if not specified)')
  .option('-a, --args <args...>', 'Additional arguments for the server (stdio only)')
  .option('-H, --header <key=value...>', 'HTTP headers for authentication (http only, repeatable)')
  .option('-e, --env <key=value...>', 'Environment variables for authentication (stdio only, repeatable)')
  .action(async (name: string, packageOrUrl: string, options) => {
    try {
      // Determine if this is a URL or package based on transport option or pattern
      const isUrl = options.transport === 'http' || packageOrUrl.startsWith('http://') || packageOrUrl.startsWith('https://');
      const transport = options.transport || (isUrl ? 'http' : 'stdio');

      console.log(`Adding server '${name}' via ${transport} (${packageOrUrl})...`);

      // Get configuration to determine API port and host
      const configManager = new ConfigManager();
      const config = await configManager.load();

      // Port precedence: Environment variable > Config file > Default
      const port = process.env.MCP2REST_PORT
        ? parseInt(process.env.MCP2REST_PORT, 10)
        : config.gateway.port;

      // Host precedence: Environment variable > Config file > Default
      const host = process.env.MCP2REST_HOST || config.gateway.host;

      // Build request body based on transport type
      const requestBody: any = { name, transport };

      if (transport === 'http') {
        requestBody.url = packageOrUrl;

        // Parse headers if provided (for HTTP transport)
        if (options.header) {
          requestBody.headers = {};
          for (const header of options.header) {
            const separatorIndex = header.indexOf('=');
            if (separatorIndex === -1) {
              console.error(`✗ Invalid header format: ${header}. Expected format: key=value`);
              process.exit(1);
            }
            const key = header.substring(0, separatorIndex);
            const value = header.substring(separatorIndex + 1); // Handle values with '=' in them
            requestBody.headers[key] = value;
          }
        }
      } else {
        requestBody.package = packageOrUrl;
        if (options.args) {
          requestBody.args = options.args;
        }

        // Parse env vars if provided (for stdio transport)
        if (options.env) {
          requestBody.env = {};
          for (const envVar of options.env) {
            const separatorIndex = envVar.indexOf('=');
            if (separatorIndex === -1) {
              console.error(`✗ Invalid env var format: ${envVar}. Expected format: key=value`);
              process.exit(1);
            }
            const key = envVar.substring(0, separatorIndex);
            const value = envVar.substring(separatorIndex + 1); // Handle values with '=' in them
            requestBody.env[key] = value;
          }
        }
      }

      // Send POST request to /servers endpoint
      const response = await fetch(`http://${host}:${port}/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json() as any;

      if (response.ok) {
        console.log(`✓ ${data.message}`);
      } else {
        console.error(`✗ Failed to add server: ${data.error.message}`);
        process.exit(1);
      }

    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error('✗ Gateway is not running. Start it with: mcp2rest start');
      } else {
        console.error('✗ Failed to add server:', error.message);
      }
      process.exit(1);
    }
  });

// Remove command - removes an MCP server
program
  .command('remove <name>')
  .description('Remove an MCP server from the gateway')
  .action(async (name: string) => {
    try {
      console.log(`Removing server '${name}'...`);

      // Get configuration to determine API port and host
      const configManager = new ConfigManager();
      const config = await configManager.load();

      // Port precedence: Environment variable > Config file > Default
      const port = process.env.MCP2REST_PORT
        ? parseInt(process.env.MCP2REST_PORT, 10)
        : config.gateway.port;

      // Host precedence: Environment variable > Config file > Default
      const host = process.env.MCP2REST_HOST || config.gateway.host;
      
      // Send DELETE request to /servers/:name endpoint
      const response = await fetch(`http://${host}:${port}/servers/${name}`, {
        method: 'DELETE'
      });
      
      const data = await response.json() as any;
      
      if (response.ok) {
        console.log(`✓ ${data.message}`);
      } else {
        console.error(`✗ Failed to remove server: ${data.error.message}`);
        process.exit(1);
      }
      
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error('✗ Gateway is not running. Start it with: mcp2rest start');
      } else {
        console.error('✗ Failed to remove server:', error.message);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
