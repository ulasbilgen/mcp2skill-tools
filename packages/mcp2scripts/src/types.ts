/**
 * Type definitions for mcp2scripts.
 *
 * Defines interfaces for mcp2rest API responses and MCP protocol types.
 */

/**
 * JSON Schema type definition
 */
export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  [key: string]: unknown;
}

/**
 * MCP Tool definition from mcp2rest API
 */
export interface Tool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}

/**
 * Server information from mcp2rest API
 */
export interface ServerInfo {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  toolCount?: number;
  transport?: 'stdio' | 'http';
  package?: string;
  url?: string;
  serverVersion?: {
    name: string;
    title?: string;
    version: string;
    websiteUrl?: string;
  };
  [key: string]: unknown;
}

/**
 * Tool call request to mcp2rest /call endpoint
 */
export interface ToolCallRequest {
  server: string;
  tool: string;
  arguments?: Record<string, unknown>;
}

/**
 * Tool call response from mcp2rest /call endpoint
 */
export interface ToolCallResponse {
  content?: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
  _meta?: {
    progressToken?: string;
    [key: string]: unknown;
  };
}

/**
 * Error response from mcp2rest API
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Options for generating a skill
 */
export interface GenerateSkillOptions {
  serverName: string;
  outputDir?: string;
  mcp2restUrl?: string;
}

/**
 * Result of skill generation
 */
export interface GenerateSkillResult {
  skillPath: string;
  serverName: string;
  toolCount: number;
  scriptsCreated: string[];
}
