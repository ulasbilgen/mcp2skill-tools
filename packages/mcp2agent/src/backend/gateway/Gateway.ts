import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ConfigManager } from './ConfigManager.js';
import {
  ServerState,
  ServerConfig,
  GatewayConfig,
  Tool,
  ServerInfo,
  ErrorCode,
  Config
} from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
let packageVersion = '0.1.0';
try {
  const packageJson = JSON.parse(
    readFileSync(path.join(__dirname, '../../../package.json'), 'utf-8')
  );
  packageVersion = packageJson.version;
} catch {
  // Use default version if package.json not found
}

// Extended ServerState for internal use
interface InternalServerState {
  config: ServerConfig;
  status: 'connected' | 'disconnected' | 'error' | 'connecting' | 'reconnecting';
  client: Client | null;
  tools: Tool[];
  reconnectAttempts: number;
  lastConnected?: Date;
  lastError?: string;
  validationWarning?: string;
  serverVersion?: {
    name: string;
    version: string;
    title?: string;
    websiteUrl?: string;
  };
}

/**
 * Core Gateway class that manages MCP server connections and tool execution
 */
export class Gateway {
  private servers: Map<string, InternalServerState>;
  private config: Config;
  private configManager: ConfigManager;
  private reconnectTimers: Map<string, NodeJS.Timeout>;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly MAX_BACKOFF_DELAY = 30000; // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(configManager: ConfigManager) {
    this.servers = new Map();
    this.configManager = configManager;
    this.config = configManager.getDefaultConfig();
    this.reconnectTimers = new Map();
  }

  /**
   * Determine transport type from server configuration
   */
  private getTransportType(config: ServerConfig): 'stdio' | 'http' {
    // Infer from config structure
    if (config.url) {
      return 'http';
    }

    if (config.package) {
      return 'stdio';
    }

    throw new Error(`${ErrorCode.INVALID_CONFIG}: Cannot determine transport type - must specify either 'url' or 'package'`);
  }

  /**
   * Initialize the gateway by loading configuration and connecting to all servers
   */
  async initialize(): Promise<void> {
    console.log('Initializing MCP Gateway...');

    // Check for migration from old mcp2rest config
    await this.configManager.migrateFromMcp2rest();

    // Load configuration
    this.config = await this.configManager.load();
    console.log(`Configuration loaded from ${this.configManager.getConfigPath()}`);

    // Connect to all configured servers
    const serverNames = Object.keys(this.config.servers);
    console.log(`Found ${serverNames.length} server(s) in configuration`);

    for (const name of serverNames) {
      const serverConfig = this.config.servers[name];
      try {
        await this.connectServer(name, serverConfig);
      } catch (error: any) {
        console.error(`Failed to connect to server '${name}': ${error.message}`);
      }
    }

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('Gateway initialization complete');
  }

  /**
   * Connect to an MCP server
   */
  private async connectServer(name: string, serverConfig: ServerConfig): Promise<void> {
    const transportType = this.getTransportType(serverConfig);
    const identifier = serverConfig.package || serverConfig.url;
    console.log(`Connecting to server '${name}' via ${transportType} (${identifier})...`);

    // Get or initialize server state
    let serverState = this.servers.get(name);
    if (!serverState) {
      serverState = {
        config: serverConfig,
        status: 'disconnected',
        client: null,
        tools: [],
        reconnectAttempts: 0
      };
      this.servers.set(name, serverState);
    }

    try {
      // Create transport based on type
      let transport;

      if (transportType === 'stdio') {
        // STDIO: Spawn process with npx
        const args = [serverConfig.package!, ...(serverConfig.args || [])];
        transport = new StdioClientTransport({
          command: 'npx',
          args: args,
          env: serverConfig.env
        });
      } else {
        // HTTP: Connect to external server via SSE
        if (!serverConfig.url) {
          throw new Error(`${ErrorCode.INVALID_CONFIG}: HTTP transport requires 'url' field`);
        }

        // Validate URL format
        let serverUrl: URL;
        try {
          serverUrl = new URL(serverConfig.url);
        } catch (error: any) {
          throw new Error(`${ErrorCode.INVALID_URL}: Invalid URL format: ${error.message}`);
        }

        // Build options with headers if provided
        const transportOptions = serverConfig.headers ? {
          requestInit: {
            headers: serverConfig.headers
          }
        } : undefined;

        transport = new StreamableHTTPClientTransport(serverUrl, transportOptions);
      }

      // Create MCP client
      const client = new Client({
        name: 'mcp2agent',
        version: packageVersion
      }, {
        capabilities: {}
      });

      let tools: Tool[] = [];
      let hasValidationWarning = false;
      let validationWarningMsg = '';

      try {
        // Connect client to transport
        await client.connect(transport);

        // Capture server metadata after connection
        const serverVersion = client.getServerVersion();
        if (serverVersion) {
          serverState.serverVersion = {
            name: serverVersion.name,
            title: serverVersion.title,
            version: serverVersion.version,
            websiteUrl: serverVersion.websiteUrl
          };
        }

        // List available tools
        const toolsResponse = await client.listTools();
        tools = toolsResponse.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }));

      } catch (error: any) {
        // Check if this is a Zod validation error from MCP SDK
        const errorStr = typeof error.message === 'string' ? error.message : JSON.stringify(error);
        const isValidationError = errorStr && (
          errorStr.includes('Expected array') ||
          errorStr.includes('Expected object') ||
          errorStr.includes('invalid_type') ||
          errorStr.includes('ZodError') ||
          errorStr.includes('"code":"invalid_type"') ||
          errorStr.includes('"code": "invalid_type"')
        );

        if (isValidationError) {
          hasValidationWarning = true;
          validationWarningMsg = `Schema validation warning: Server may not be fully MCP-compliant`;

          console.warn(`⚠ Server '${name}' has schema validation issues but will attempt to connect`);
          console.warn(`  Warning: ${error.message}`);

          try {
            const toolsResponse = await client.listTools();
            tools = toolsResponse.tools.map((tool: any) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema
            }));
          } catch (toolsError) {
            console.warn(`  Could not list tools due to validation issues`);
          }
        } else {
          throw error;
        }
      }

      // Update server state
      serverState.client = client;
      serverState.tools = tools;
      serverState.status = 'connected';
      serverState.lastConnected = new Date();
      serverState.reconnectAttempts = 0;

      if (hasValidationWarning) {
        serverState.validationWarning = validationWarningMsg;
      } else {
        serverState.validationWarning = undefined;
      }

      // Clear any existing reconnect timer
      this.clearReconnectTimer(name);

      // Set up disconnect handler for auto-reconnect
      this.setupDisconnectHandler(name, client);

      if (hasValidationWarning) {
        console.log(`✓ Connected to server '${name}' with ${tools.length} tool(s) (with validation warnings)`);
      } else {
        console.log(`✓ Connected to server '${name}' with ${tools.length} tool(s)`);
      }

    } catch (error: any) {
      serverState.status = 'error';
      serverState.lastError = error.message;
      console.error(`✗ Failed to connect to server '${name}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Set up disconnect handler for a client to enable auto-reconnect
   */
  private setupDisconnectHandler(name: string, client: Client): void {
    client.onclose = () => {
      const serverState = this.servers.get(name);
      if (!serverState) return;

      console.log(`⚠ Server '${name}' disconnected unexpectedly`);
      serverState.status = 'disconnected';
      serverState.client = null;

      this.scheduleReconnect(name);
    };

    client.onerror = (error: Error) => {
      const serverState = this.servers.get(name);
      if (!serverState) return;

      console.error(`⚠ Server '${name}' error: ${error.message}`);
      serverState.lastError = error.message;
    };
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(name: string): void {
    const serverState = this.servers.get(name);
    if (!serverState) return;

    if (serverState.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`✗ Server '${name}' exceeded maximum reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS})`);
      serverState.status = 'error';
      serverState.lastError = 'Maximum reconnection attempts exceeded';
      return;
    }

    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, serverState.reconnectAttempts);
    const delay = Math.min(exponentialDelay, this.MAX_BACKOFF_DELAY);

    serverState.reconnectAttempts++;
    serverState.status = 'reconnecting';

    console.log(`⟳ Scheduling reconnection for server '${name}' (attempt ${serverState.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);

    this.clearReconnectTimer(name);

    const timer = setTimeout(async () => {
      console.log(`⟳ Attempting to reconnect to server '${name}' (attempt ${serverState.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);

      try {
        await this.connectServer(name, serverState.config);
        console.log(`✓ Successfully reconnected to server '${name}'`);
      } catch (error: any) {
        console.error(`✗ Reconnection attempt failed for server '${name}': ${error.message}`);
        serverState.lastError = error.message;
        this.scheduleReconnect(name);
      }
    }, delay);

    this.reconnectTimers.set(name, timer);
  }

  /**
   * Clear reconnection timer for a server
   */
  private clearReconnectTimer(name: string): void {
    const timer = this.reconnectTimers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(name);
    }
  }

  /**
   * Call a tool on a specific MCP server
   */
  async callTool(serverName: string, toolName: string, args: any): Promise<any> {
    const serverState = this.servers.get(serverName);

    if (!serverState) {
      throw new Error(`${ErrorCode.SERVER_NOT_FOUND}: Server '${serverName}' not found`);
    }

    if (serverState.status !== 'connected' || !serverState.client) {
      throw new Error(`${ErrorCode.SERVER_DISCONNECTED}: Server '${serverName}' is not connected`);
    }

    const timeout = this.config.gateway.timeout || 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${ErrorCode.TOOL_TIMEOUT}: Tool execution exceeded ${timeout}ms timeout`));
      }, timeout);
    });

    try {
      console.log(`Executing tool '${toolName}' on server '${serverName}'...`);

      const executionPromise = serverState.client.callTool({
        name: toolName,
        arguments: args
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      console.log(`✓ Tool '${toolName}' executed successfully on server '${serverName}'`);
      return result;

    } catch (error: any) {
      console.error(`✗ Tool execution failed: ${error.message}`);

      if (error.message.includes(ErrorCode.TOOL_TIMEOUT)) {
        throw error;
      }

      throw new Error(`TOOL_EXECUTION_ERROR: ${error.message}`);
    }
  }

  /**
   * Get information about all servers
   */
  getServerInfo(): ServerInfo[] {
    const serverInfoList: ServerInfo[] = [];

    for (const [name, state] of this.servers.entries()) {
      const transportType = this.getTransportType(state.config);

      const info: ServerInfo = {
        name,
        transport: transportType,
        status: state.status,
        toolCount: state.tools.length,
        serverVersion: state.serverVersion
      };

      if (transportType === 'stdio') {
        info.package = state.config.package;
        if (state.config.env && Object.keys(state.config.env).length > 0) {
          info.hasEnv = true;
        }
      } else {
        info.url = state.config.url;
        if (state.config.headers && Object.keys(state.config.headers).length > 0) {
          info.hasHeaders = true;
        }
      }

      serverInfoList.push(info);
    }

    return serverInfoList;
  }

  /**
   * Get tools for a specific server
   */
  getServerTools(serverName: string): Tool[] {
    const serverState = this.servers.get(serverName);

    if (!serverState) {
      throw new Error(`${ErrorCode.SERVER_NOT_FOUND}: Server '${serverName}' not found`);
    }

    return serverState.tools;
  }

  /**
   * Add a new server dynamically
   */
  async addServer(
    name: string,
    options: {
      package?: string;
      args?: string[];
      url?: string;
      headers?: Record<string, string>;
      env?: Record<string, string>;
    }
  ): Promise<void> {
    if (this.servers.has(name)) {
      throw new Error(`${ErrorCode.SERVER_ALREADY_EXISTS}: Server '${name}' already exists`);
    }

    const serverConfig: ServerConfig = { ...options };

    try {
      this.getTransportType(serverConfig);
    } catch (error: any) {
      throw new Error(`${ErrorCode.INVALID_CONFIG}: ${error.message}`);
    }

    try {
      await this.configManager.addServer(name, serverConfig);
      await this.connectServer(name, serverConfig);
      console.log(`✓ Server '${name}' added successfully`);
    } catch (error: any) {
      console.error(`✗ Failed to add server '${name}': ${error.message}`);
      throw new Error(`SERVER_ADD_FAILED: ${error.message}`);
    }
  }

  /**
   * Remove a server
   */
  async removeServer(name: string): Promise<void> {
    const serverState = this.servers.get(name);

    if (!serverState) {
      throw new Error(`${ErrorCode.SERVER_NOT_FOUND}: Server '${name}' not found`);
    }

    try {
      this.servers.delete(name);
      this.clearReconnectTimer(name);

      if (serverState.client) {
        await serverState.client.close();
      }

      await this.configManager.removeServer(name);
      console.log(`✓ Server '${name}' removed successfully`);
    } catch (error: any) {
      console.error(`✗ Failed to remove server '${name}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Start periodic health monitoring for all servers
   */
  private startHealthMonitoring(): void {
    console.log(`Starting health monitoring (interval: ${this.HEALTH_CHECK_INTERVAL}ms)`);

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Health monitoring stopped');
    }
  }

  /**
   * Perform health checks on all connected servers
   */
  private async performHealthChecks(): Promise<void> {
    for (const [name, state] of this.servers.entries()) {
      if (state.status === 'connected' && state.client) {
        try {
          await Promise.race([
            state.client.listTools(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Health check timeout')), 5000)
            )
          ]);
        } catch (error: any) {
          console.warn(`⚠ Health check failed for server '${name}': ${error.message}`);
          state.status = 'disconnected';
          state.client = null;
          state.lastError = `Health check failed: ${error.message}`;
          this.scheduleReconnect(name);
        }
      }
    }
  }

  /**
   * Get the config manager instance
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  /**
   * Shutdown the gateway and disconnect all servers
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down MCP Gateway...');

    this.stopHealthMonitoring();

    for (const name of this.reconnectTimers.keys()) {
      this.clearReconnectTimer(name);
    }

    for (const [name, state] of this.servers.entries()) {
      if (state.client) {
        try {
          await state.client.close();
          console.log(`✓ Disconnected from server '${name}'`);
        } catch (error: any) {
          console.error(`✗ Error disconnecting from server '${name}': ${error.message}`);
        }
      }
    }

    this.servers.clear();
    console.log('Gateway shutdown complete');
  }
}
