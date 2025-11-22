import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import * as path from 'path';
import { ConfigManager } from '../config/ConfigManager.js';
import {
  ServerState,
  ServerConfig,
  GatewayConfig,
  Tool,
  ServerInfo,
  ErrorCode
} from '../types/index.js';

// Read version from package.json (relative to dist/gateway/)
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
);

/**
 * Core Gateway class that manages MCP server connections and tool execution
 */
export class Gateway {
  private servers: Map<string, ServerState>;
  private config: GatewayConfig;
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
    // Explicit transport specified
    if (config.transport) {
      return config.transport;
    }

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
          args: args
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

        transport = new StreamableHTTPClientTransport(serverUrl);
      }

      // Create MCP client (same for both transports)
      const client = new Client({
        name: 'mcp2rest',
        version: packageJson.version
      }, {
        capabilities: {}
      });

      let tools: Tool[] = [];
      let hasValidationWarning = false;
      let validationWarningMsg = '';

      try {
        // Connect client to transport
        await client.connect(transport);

        // List available tools
        const toolsResponse = await client.listTools();
        tools = toolsResponse.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }));

      } catch (error: any) {
        // Check if this is a Zod validation error from MCP SDK
        // Error can be either a string or a stringified JSON array
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
          // This is a schema validation error - allow connection with warning
          hasValidationWarning = true;
          validationWarningMsg = `Schema validation warning: Server may not be fully MCP-compliant`;

          console.warn(`⚠ Server '${name}' has schema validation issues but will attempt to connect`);
          console.warn(`  Warning: ${error.message}`);

          // Try to list tools anyway (might work despite init validation failure)
          try {
            const toolsResponse = await client.listTools();
            tools = toolsResponse.tools.map((tool: any) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema
            }));
          } catch (toolsError) {
            // If listing tools also fails, leave tools as empty array
            console.warn(`  Could not list tools due to validation issues`);
          }
        } else {
          // This is a real connection error - re-throw
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
    // Listen for transport close events
    client.onclose = () => {
      const serverState = this.servers.get(name);
      if (!serverState) return;
      
      console.log(`⚠ Server '${name}' disconnected unexpectedly`);
      serverState.status = 'disconnected';
      serverState.client = null;
      
      // Trigger reconnection
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
    
    // Check if we've exceeded max reconnection attempts
    if (serverState.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`✗ Server '${name}' exceeded maximum reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS})`);
      serverState.status = 'error';
      serverState.lastError = 'Maximum reconnection attempts exceeded';
      return;
    }
    
    // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const baseDelay = 1000; // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, serverState.reconnectAttempts);
    const delay = Math.min(exponentialDelay, this.MAX_BACKOFF_DELAY);
    
    serverState.reconnectAttempts++;
    serverState.status = 'reconnecting';
    
    console.log(`⟳ Scheduling reconnection for server '${name}' (attempt ${serverState.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
    
    // Clear any existing timer
    this.clearReconnectTimer(name);
    
    // Schedule reconnection
    const timer = setTimeout(async () => {
      console.log(`⟳ Attempting to reconnect to server '${name}' (attempt ${serverState.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
      
      try {
        await this.connectServer(name, serverState.config);
        console.log(`✓ Successfully reconnected to server '${name}'`);
      } catch (error: any) {
        console.error(`✗ Reconnection attempt failed for server '${name}': ${error.message}`);
        serverState.lastError = error.message;
        
        // Schedule next reconnection attempt
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
    // Look up server by name
    const serverState = this.servers.get(serverName);
    
    if (!serverState) {
      throw new Error(`${ErrorCode.SERVER_NOT_FOUND}: Server '${serverName}' not found`);
    }
    
    if (serverState.status !== 'connected' || !serverState.client) {
      throw new Error(`${ErrorCode.SERVER_DISCONNECTED}: Server '${serverName}' is not connected`);
    }
    
    // Create timeout promise
    const timeout = this.config.gateway.timeout || 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${ErrorCode.TOOL_TIMEOUT}: Tool execution exceeded ${timeout}ms timeout`));
      }, timeout);
    });
    
    // Execute tool with timeout
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
      
      // Check if it's a timeout error
      if (error.message.includes(ErrorCode.TOOL_TIMEOUT)) {
        throw error;
      }
      
      throw new Error(`${ErrorCode.TOOL_EXECUTION_ERROR}: ${error.message}`);
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
        error: state.lastError,
        lastConnected: state.lastConnected?.toISOString(),
        validationWarning: state.validationWarning
      };

      // Add transport-specific fields
      if (transportType === 'stdio') {
        info.package = state.config.package;
      } else {
        info.url = state.config.url;
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
      transport?: 'stdio' | 'http';
    }
  ): Promise<void> {
    // Check if server already exists
    if (this.servers.has(name)) {
      throw new Error(`${ErrorCode.SERVER_ALREADY_EXISTS}: Server '${name}' already exists`);
    }

    const serverConfig: ServerConfig = {
      name,
      ...options
    };

    // Validate configuration before proceeding
    try {
      this.getTransportType(serverConfig);
    } catch (error: any) {
      throw new Error(`${ErrorCode.INVALID_CONFIG}: ${error.message}`);
    }

    try {
      // Add to configuration file
      await this.configManager.addServer(name, serverConfig);

      // Connect to the server
      await this.connectServer(name, serverConfig);

      console.log(`✓ Server '${name}' added successfully`);

    } catch (error: any) {
      console.error(`✗ Failed to add server '${name}': ${error.message}`);
      throw new Error(`${ErrorCode.SERVER_ADD_FAILED}: ${error.message}`);
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
      // Remove from servers map FIRST to prevent reconnection when client closes
      // (disconnect handler checks if server exists before scheduling reconnect)
      this.servers.delete(name);

      // Clear any reconnection timers
      this.clearReconnectTimer(name);

      // Disconnect client if connected
      if (serverState.client) {
        await serverState.client.close();
      }

      // Remove from configuration
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
      // Only check servers that are supposed to be connected
      if (state.status === 'connected' && state.client) {
        try {
          // Attempt to list tools as a health check
          // This is a lightweight operation that verifies the connection is alive
          await Promise.race([
            state.client.listTools(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), 5000)
            )
          ]);
          
          // Connection is healthy
        } catch (error: any) {
          console.warn(`⚠ Health check failed for server '${name}': ${error.message}`);
          
          // Mark as disconnected and trigger reconnection
          state.status = 'disconnected';
          state.client = null;
          state.lastError = `Health check failed: ${error.message}`;
          
          this.scheduleReconnect(name);
        }
      }
    }
  }

  /**
   * Shutdown the gateway and disconnect all servers
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down MCP Gateway...');
    
    // Stop health monitoring
    this.stopHealthMonitoring();
    
    // Clear all reconnection timers
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
