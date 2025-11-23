/**
 * mcp2scripts: Generate JavaScript scripts from MCP Server Tools for Claude Code Skills to use.
 *
 * This package queries your local mcp2rest service and generates JavaScript scripts
 * for each MCP tool, making them available as Claude Code skills.
 *
 * @example
 * ```typescript
 * import { ScriptGenerator } from 'mcp2scripts';
 *
 * const gen = new ScriptGenerator('http://localhost:28888');
 * const result = await gen.generateSkill('chrome-devtools');
 * console.log(`Skill generated at: ${result.skillPath}`);
 * console.log(`Created ${result.toolCount} tool scripts`);
 * ```
 *
 * CLI Usage:
 * ```bash
 * mcp2scripts servers
 * mcp2scripts generate chrome-devtools
 * mcp2scripts generate --all
 * ```
 */

// Export version (imported from package.json)
export { VERSION } from './version.js';

// Export core generator
export { ScriptGenerator } from './generator.js';

// Export exceptions
export * from './exceptions.js';

// Export types
export type { ServerInfo, Tool, JsonSchema, GenerateSkillResult } from './types.js';
