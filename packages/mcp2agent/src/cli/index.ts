#!/usr/bin/env node

import { program } from 'commander';
import { spawn, execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
let version = '0.1.0';
try {
  const packageJson = JSON.parse(
    readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
  );
  version = packageJson.version;
} catch {
  // Use default version
}

const CONFIG_DIR = path.join(os.homedir(), '.mcp2agent');
const PID_FILE = path.join(CONFIG_DIR, 'mcp2agent.pid');
const DEFAULT_PORT = 28888;
const DEFAULT_HOST = 'localhost';

/**
 * Check if the server is running by checking the PID file and health endpoint
 */
async function isServerRunning(): Promise<{ running: boolean; pid?: number; url?: string }> {
  if (!existsSync(PID_FILE)) {
    return { running: false };
  }

  try {
    const pidContent = readFileSync(PID_FILE, 'utf-8');
    const [pidStr, url] = pidContent.split('\n');
    const pid = parseInt(pidStr, 10);

    // Check if process exists
    try {
      process.kill(pid, 0);
    } catch {
      // Process doesn't exist, clean up PID file
      unlinkSync(PID_FILE);
      return { running: false };
    }

    // Check health endpoint
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        return { running: true, pid, url };
      }
    } catch {
      // Health check failed but process exists
    }

    return { running: true, pid, url };
  } catch {
    return { running: false };
  }
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Write PID file
 */
function writePidFile(pid: number, url: string): void {
  ensureConfigDir();
  writeFileSync(PID_FILE, `${pid}\n${url}`);
}

/**
 * Remove PID file
 */
function removePidFile(): void {
  if (existsSync(PID_FILE)) {
    unlinkSync(PID_FILE);
  }
}

// Main program
program
  .name('mcp2agent')
  .description('Unified MCP server management with Web UI')
  .version(version);

// Start command
program
  .command('start')
  .description('Start the mcp2agent server')
  .option('-p, --port <number>', 'Port to listen on', DEFAULT_PORT.toString())
  .option('-h, --host <string>', 'Host to bind to', DEFAULT_HOST)
  .option('-d, --daemon', 'Run as daemon (background)')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const url = `http://${host}:${port}`;

    // Check if already running
    const status = await isServerRunning();
    if (status.running) {
      console.log(`mcp2agent is already running (PID: ${status.pid})`);
      console.log(`URL: ${status.url}`);
      return;
    }

    if (options.daemon) {
      // Start as daemon
      console.log('Starting mcp2agent as daemon...');

      const serverPath = path.join(__dirname, '../backend/index.js');
      const child = spawn('node', [serverPath], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          MCP2AGENT_PORT: port.toString(),
          MCP2AGENT_HOST: host
        }
      });

      child.unref();

      // Write PID file
      writePidFile(child.pid!, url);

      // Wait a moment for startup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify it started
      const newStatus = await isServerRunning();
      if (newStatus.running) {
        console.log(`✓ mcp2agent started successfully (PID: ${child.pid})`);
        console.log(`  URL: ${url}`);
        console.log(`  Web UI: ${url}`);
      } else {
        console.error('✗ Failed to start mcp2agent');
        removePidFile();
        process.exit(1);
      }
    } else {
      // Start in foreground
      console.log(`Starting mcp2agent on ${url}...`);

      // Import and start server
      const { Server } = await import('../backend/index.js');
      const server = new Server();

      // Write PID file
      writePidFile(process.pid, url);

      // Handle shutdown
      const shutdown = async () => {
        console.log('\nShutting down...');
        await server.stop();
        removePidFile();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      try {
        await server.start(port, host);
      } catch (error: any) {
        console.error('Failed to start server:', error.message);
        removePidFile();
        process.exit(1);
      }
    }
  });

// Stop command
program
  .command('stop')
  .description('Stop the mcp2agent server')
  .action(async () => {
    const status = await isServerRunning();

    if (!status.running) {
      console.log('mcp2agent is not running');
      return;
    }

    console.log(`Stopping mcp2agent (PID: ${status.pid})...`);

    try {
      process.kill(status.pid!, 'SIGTERM');

      // Wait for process to exit
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          process.kill(status.pid!, 0);
          attempts++;
        } catch {
          // Process exited
          break;
        }
      }

      removePidFile();
      console.log('✓ mcp2agent stopped');
    } catch (error: any) {
      console.error('Failed to stop mcp2agent:', error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check mcp2agent server status')
  .action(async () => {
    const status = await isServerRunning();

    if (status.running) {
      console.log('mcp2agent is running');
      console.log(`  PID: ${status.pid}`);
      console.log(`  URL: ${status.url}`);

      // Try to get server info
      try {
        const response = await fetch(`${status.url}/health`);
        if (response.ok) {
          const health = await response.json() as { serverCount: number; connectedServers: number };
          console.log(`  Servers: ${health.serverCount} (${health.connectedServers} connected)`);
        }
      } catch {
        console.log('  Health check: unavailable');
      }
    } else {
      console.log('mcp2agent is not running');
    }
  });

// Open command
program
  .command('open')
  .description('Open mcp2agent Web UI in browser')
  .action(async () => {
    const status = await isServerRunning();

    if (!status.running) {
      console.log('mcp2agent is not running. Start it first with: mcp2agent start');
      return;
    }

    console.log(`Opening ${status.url} in browser...`);
    await open(status.url!);
  });

// Logs command
program
  .command('logs')
  .description('View mcp2agent logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines to show', '100')
  .action((options) => {
    const logFile = path.join(CONFIG_DIR, 'logs', 'mcp2agent.log');

    if (!existsSync(logFile)) {
      console.log('No logs found. Server may not have been started yet.');
      return;
    }

    if (options.follow) {
      const tail = spawn('tail', ['-f', '-n', options.lines, logFile], {
        stdio: 'inherit'
      });
      tail.on('error', () => {
        console.log('Unable to follow logs. Install tail or use without -f flag.');
      });
    } else {
      try {
        execSync(`tail -n ${options.lines} "${logFile}"`, { stdio: 'inherit' });
      } catch {
        console.log('Unable to read logs.');
      }
    }
  });

// Service subcommands (PM2)
const service = program
  .command('service')
  .description('Manage mcp2agent as a system service (PM2)');

service
  .command('install')
  .description('Install mcp2agent as a PM2 service')
  .action(async () => {
    console.log('Installing mcp2agent as PM2 service...');

    try {
      // Check if PM2 is available
      execSync('pm2 --version', { stdio: 'ignore' });
    } catch {
      console.error('PM2 is not installed. Install it with: npm install -g pm2');
      process.exit(1);
    }

    const serverPath = path.join(__dirname, '../backend/index.js');

    // Create PM2 ecosystem config
    const ecosystemConfig = {
      apps: [{
        name: 'mcp2agent',
        script: serverPath,
        cwd: path.dirname(serverPath),
        interpreter: 'node',
        env: {
          NODE_ENV: 'production'
        },
        max_memory_restart: '500M',
        error_file: path.join(CONFIG_DIR, 'logs', 'error.log'),
        out_file: path.join(CONFIG_DIR, 'logs', 'out.log'),
        merge_logs: true
      }]
    };

    const ecosystemPath = path.join(CONFIG_DIR, 'ecosystem.config.cjs');
    writeFileSync(ecosystemPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)}`);

    try {
      execSync(`pm2 start "${ecosystemPath}"`, { stdio: 'inherit' });
      execSync('pm2 save', { stdio: 'ignore' });
      console.log('\n✓ mcp2agent installed as PM2 service');
      console.log('  The service will auto-start on system boot.');
      console.log('  Use "mcp2agent service status" to check status.');
    } catch (error: any) {
      console.error('Failed to install service:', error.message);
      process.exit(1);
    }
  });

service
  .command('uninstall')
  .description('Remove mcp2agent PM2 service')
  .action(() => {
    console.log('Removing mcp2agent PM2 service...');

    try {
      execSync('pm2 delete mcp2agent', { stdio: 'inherit' });
      execSync('pm2 save', { stdio: 'ignore' });
      console.log('✓ mcp2agent service removed');
    } catch {
      console.log('Service not found or already removed');
    }
  });

service
  .command('status')
  .description('Check PM2 service status')
  .action(() => {
    try {
      execSync('pm2 describe mcp2agent', { stdio: 'inherit' });
    } catch {
      console.log('mcp2agent service is not installed');
    }
  });

service
  .command('restart')
  .description('Restart PM2 service')
  .action(() => {
    try {
      execSync('pm2 restart mcp2agent', { stdio: 'inherit' });
      console.log('✓ mcp2agent service restarted');
    } catch {
      console.error('Failed to restart service. Is it installed?');
      process.exit(1);
    }
  });

service
  .command('logs')
  .description('View PM2 service logs')
  .option('-f, --follow', 'Follow log output')
  .action((options) => {
    const args = options.follow ? ['logs', 'mcp2agent', '--lines', '100'] : ['logs', 'mcp2agent', '--lines', '100', '--nostream'];
    try {
      execSync(`pm2 ${args.join(' ')}`, { stdio: 'inherit' });
    } catch {
      console.log('Unable to view logs. Is the service installed?');
    }
  });

// Server management shortcuts
program
  .command('add <name> <package-or-url>')
  .description('Add an MCP server')
  .option('-a, --args <args...>', 'Arguments for stdio servers')
  .option('-H, --header <key=value...>', 'HTTP headers for authentication')
  .option('-e, --env <key=value...>', 'Environment variables for stdio servers')
  .action(async (name, packageOrUrl, options) => {
    const status = await isServerRunning();

    if (!status.running) {
      console.error('mcp2agent is not running. Start it first with: mcp2agent start');
      process.exit(1);
    }

    // Parse headers and env vars
    const headers: Record<string, string> = {};
    const env: Record<string, string> = {};

    if (options.header) {
      for (const h of options.header) {
        const [key, ...valueParts] = h.split('=');
        headers[key] = valueParts.join('=');
      }
    }

    if (options.env) {
      for (const e of options.env) {
        const [key, ...valueParts] = e.split('=');
        env[key] = valueParts.join('=');
      }
    }

    // Determine if this is a URL or package
    const isUrl = packageOrUrl.startsWith('http://') || packageOrUrl.startsWith('https://');

    const body = isUrl
      ? { name, url: packageOrUrl, headers: Object.keys(headers).length > 0 ? headers : undefined }
      : { name, package: packageOrUrl, args: options.args, env: Object.keys(env).length > 0 ? env : undefined };

    try {
      const response = await fetch(`${status.url}/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json() as { success: boolean; error?: { message: string } };

      if (response.ok) {
        console.log(`✓ Server '${name}' added successfully`);
      } else {
        console.error(`✗ Failed to add server: ${result.error?.message || 'Unknown error'}`);
        process.exit(1);
      }
    } catch (error: any) {
      console.error('Failed to connect to mcp2agent:', error.message);
      process.exit(1);
    }
  });

program
  .command('remove <name>')
  .description('Remove an MCP server')
  .action(async (name) => {
    const status = await isServerRunning();

    if (!status.running) {
      console.error('mcp2agent is not running. Start it first with: mcp2agent start');
      process.exit(1);
    }

    try {
      const response = await fetch(`${status.url}/servers/${name}`, {
        method: 'DELETE'
      });

      const result = await response.json() as { success: boolean; error?: { message: string } };

      if (response.ok) {
        console.log(`✓ Server '${name}' removed`);
      } else {
        console.error(`✗ Failed to remove server: ${result.error?.message || 'Unknown error'}`);
        process.exit(1);
      }
    } catch (error: any) {
      console.error('Failed to connect to mcp2agent:', error.message);
      process.exit(1);
    }
  });

program
  .command('servers')
  .description('List all MCP servers')
  .action(async () => {
    const status = await isServerRunning();

    if (!status.running) {
      console.error('mcp2agent is not running. Start it first with: mcp2agent start');
      process.exit(1);
    }

    interface ServerData {
      name: string;
      status: string;
      toolCount?: number;
      transport?: string;
      package?: string;
      url?: string;
      serverVersion?: { version: string };
    }

    try {
      const response = await fetch(`${status.url}/servers`);
      const result = await response.json() as { success: boolean; data?: ServerData[] };

      if (!result.success || !result.data) {
        console.error('Failed to get servers');
        process.exit(1);
      }

      if (result.data.length === 0) {
        console.log('No servers configured');
        return;
      }

      console.log('\nMCP Servers:\n');
      for (const server of result.data) {
        const statusIcon = server.status === 'connected' ? '✓' : server.status === 'error' ? '✗' : '○';
        const version = server.serverVersion?.version ? `v${server.serverVersion.version}` : '';
        console.log(`  ${statusIcon} ${server.name} ${version}`);
        console.log(`    Status: ${server.status}`);
        console.log(`    Tools: ${server.toolCount || 0}`);
        console.log(`    Transport: ${server.transport}`);
        if (server.package) console.log(`    Package: ${server.package}`);
        if (server.url) console.log(`    URL: ${server.url}`);
        console.log('');
      }
    } catch (error: any) {
      console.error('Failed to connect to mcp2agent:', error.message);
      process.exit(1);
    }
  });

program.parse();
