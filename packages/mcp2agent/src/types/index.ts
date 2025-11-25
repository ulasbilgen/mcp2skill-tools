// Server types
export interface ServerConfig {
  package?: string;
  url?: string;
  args?: string[];
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface ServerVersionInfo {
  name: string;
  version: string;
  title?: string;
  websiteUrl?: string;
}

export interface ServerInfo {
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting' | 'reconnecting';
  toolCount?: number;
  transport?: 'stdio' | 'http';
  package?: string;
  url?: string;
  serverVersion?: ServerVersionInfo;
  hasHeaders?: boolean;
  hasEnv?: boolean;
}

export interface ServerState extends ServerInfo {
  client?: unknown;
  transport?: 'stdio' | 'http';
  reconnectAttempts?: number;
}

// Tool types
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  items?: JsonSchema;
  enum?: string[];
  default?: unknown;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}

// Gateway config
export interface GatewayConfig {
  port: number;
  host: string;
  timeout: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface Config {
  servers: Record<string, ServerConfig>;
  gateway: GatewayConfig;
  versions?: Record<string, VersionInfo>;
}

// Version tracking
export interface VersionInfo {
  serverVersion: string;
  scriptVersion: string;
  lastGenerated: string;
  skillPath?: string;
}

// Skill generation
export interface GenerateSkillResult {
  skillPath: string;
  serverName: string;
  toolCount: number;
  scriptsCreated: string[];
}

export interface SkillDocs {
  skillMd: string;
  workflows?: Record<string, string>;
  reference?: Record<string, string>;
}

// LLM types
export type LLMProvider = 'anthropic' | 'openai' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  features: ('skill_md' | 'workflows' | 'reference')[];
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Error codes
export enum ErrorCode {
  SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  SERVER_DISCONNECTED = 'SERVER_DISCONNECTED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  SERVER_ALREADY_EXISTS = 'SERVER_ALREADY_EXISTS',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  INVALID_CONFIG = 'INVALID_CONFIG',
  INVALID_URL = 'INVALID_URL',
  LLM_ERROR = 'LLM_ERROR',
  GENERATION_ERROR = 'GENERATION_ERROR',
}
