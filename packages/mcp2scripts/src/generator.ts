/**
 * ScriptGenerator - Main class for generating JavaScript scripts from MCP tools
 * (Placeholder - will be implemented in Phase 6)
 */

export class ScriptGenerator {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the base URL of the mcp2rest service
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
