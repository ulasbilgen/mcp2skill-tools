/**
 * Custom exceptions for mcp2scripts.
 *
 * Provides clear, actionable error messages for common failure modes.
 */

/**
 * Base exception for all mcp2scripts errors.
 *
 * All mcp2scripts exceptions inherit from this base class.
 */
export class MCPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCPError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Failed to connect to MCP server.
 *
 * This error occurs when:
 * - Server executable not found
 * - Server crashes during startup
 * - Network connection fails (for remote servers)
 * - Server process terminates unexpectedly
 *
 * @example
 * ```typescript
 * import { ScriptGenerator, MCPConnectionError } from 'mcp2scripts';
 *
 * try {
 *   const gen = new ScriptGenerator('http://invalid-endpoint:9999');
 *   const servers = await gen.listServers();
 * } catch (error) {
 *   if (error instanceof MCPConnectionError) {
 *     console.error(`Connection failed: ${error.message}`);
 *   }
 * }
 * ```
 */
export class MCPConnectionError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'MCPConnectionError';
  }
}

/**
 * Tool execution failed.
 *
 * This error occurs when:
 * - Tool call fails on the server
 * - Tool returns an error response
 * - Tool arguments are invalid
 *
 * The error message includes details from the server about what went wrong.
 *
 * @note Currently unused in mcp2scripts (reserved for future use)
 * Originally from mcp2py for tool execution errors
 */
export class MCPToolError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'MCPToolError';
  }
}

/**
 * Resource access failed.
 *
 * This error occurs when:
 * - Requested resource doesn't exist
 * - Resource access is denied
 * - Resource fetch fails
 *
 * @note Currently unused in mcp2scripts (reserved for future use)
 * Originally from mcp2py for resource access errors
 */
export class MCPResourceError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'MCPResourceError';
  }
}

/**
 * Prompt execution failed.
 *
 * This error occurs when:
 * - Requested prompt doesn't exist
 * - Prompt arguments are invalid
 * - Prompt generation fails
 *
 * @note Currently unused in mcp2scripts (reserved for future use)
 * Originally from mcp2py for prompt execution errors
 */
export class MCPPromptError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'MCPPromptError';
  }
}

/**
 * Arguments failed validation.
 *
 * This error occurs when:
 * - Required arguments are missing
 * - Argument types don't match schema
 * - Argument values are out of range
 *
 * @note Currently unused in mcp2scripts (reserved for future use)
 * Originally from mcp2py for argument validation errors
 */
export class MCPValidationError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'MCPValidationError';
  }
}

/**
 * Sampling request failed.
 *
 * This error occurs when:
 * - Sampling is disabled but server requests it
 * - LLM API call fails
 * - No API keys available for sampling
 *
 * @note Currently unused in mcp2scripts (reserved for future use)
 * Originally from mcp2py for LLM sampling errors
 */
export class MCPSamplingError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'MCPSamplingError';
  }
}

/**
 * Elicitation request failed.
 *
 * This error occurs when:
 * - Elicitation is disabled but server requests it
 * - User input fails validation
 * - Input prompt fails
 *
 * @note Currently unused in mcp2scripts (reserved for future use)
 * Originally from mcp2py for user input elicitation errors
 */
export class MCPElicitationError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'MCPElicitationError';
  }
}

/**
 * Configuration error.
 *
 * This error occurs when:
 * - Invalid configuration provided
 * - Registry file is corrupted
 * - Configuration file has syntax errors
 *
 * @note Currently unused in mcp2scripts (reserved for future use)
 * Originally from mcp2py for configuration errors
 */
export class MCPConfigError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'MCPConfigError';
  }
}
