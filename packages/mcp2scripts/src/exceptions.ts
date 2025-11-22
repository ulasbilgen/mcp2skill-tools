/**
 * Exception classes for mcp2scripts
 * (Placeholder - will be implemented in Phase 3)
 */

export class MCPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCPError';
  }
}
