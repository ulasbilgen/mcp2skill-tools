import { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Configuration for a single MCP server
 */
export interface ServerConfig {
  name: string;
  // For stdio transport
  package?: string;
  args?: string[];
  env?: Record<string, string>;  // Environment variables for stdio transport
  // For HTTP transport
  url?: string;
  headers?: Record<string, string>;  // HTTP headers for authentication
  // Optional explicit transport type
  transport?: 'stdio' | 'http';
}

/**
 * Runtime state of an MCP server connection
 */
export interface ServerState {
  config: ServerConfig;
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
  client: Client | null;
  tools: Tool[];
  reconnectAttempts: number;
  lastError?: string;
  lastConnected?: Date;
  validationWarning?: string; // Warning message if server has schema validation issues
  serverVersion?: {
    name: string;
    title?: string;
    version: string;
    websiteUrl?: string;
  };
}

/**
 * Tool definition from MCP server
 */
export interface Tool {
  name: string;
  description?: string;
  inputSchema: any;
}

/**
 * Gateway configuration structure
 */
export interface GatewayConfig {
  servers: Record<string, ServerConfig>;
  gateway: {
    port: number;
    host: string;
    timeout: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Server information for API responses
 */
export interface ServerInfo {
  name: string;
  transport: string;
  package?: string;  // Only for stdio
  url?: string;      // Only for HTTP
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
  toolCount: number;
  error?: string;
  lastConnected?: string;
  validationWarning?: string; // Warning if server has schema validation issues
  hasHeaders?: boolean;  // Indicates if HTTP headers are configured (security: don't expose values)
  hasEnv?: boolean;      // Indicates if environment variables are configured (security: don't expose values)
  serverVersion?: {
    name: string;
    title?: string;
    version: string;
    websiteUrl?: string;
  };
}

/**
 * Process status information
 */
export interface ProcessStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
}

/**
 * Error codes for standardized error handling
 */
export enum ErrorCode {
  // Server errors
  SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',
  SERVER_DISCONNECTED = 'SERVER_DISCONNECTED',
  SERVER_ADD_FAILED = 'SERVER_ADD_FAILED',
  SERVER_ALREADY_EXISTS = 'SERVER_ALREADY_EXISTS',
  
  // Tool errors
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  
  // Validation errors
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  INVALID_CONFIG = 'INVALID_CONFIG',
  INVALID_URL = 'INVALID_URL',
  INVALID_TRANSPORT = 'INVALID_TRANSPORT',

  // System errors
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  DAEMON_NOT_RUNNING = 'DAEMON_NOT_RUNNING'
}

/**
 * Tool execution response
 */
export interface ToolResponse {
  success: true;
  result: {
    content: Array<{
      type: string;
      text?: string;
      data?: any;
    }>;
  };
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    serverName?: string;
    toolName?: string;
    details?: any;
  };
}
