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
 * const skillDir = await gen.generateSkill('chrome-devtools');
 * console.log(`Skill generated at: ${skillDir}`);
 * ```
 *
 * CLI Usage:
 * ```bash
 * mcp2scripts servers
 * mcp2scripts generate chrome-devtools
 * mcp2scripts generate --all
 * ```
 */

export const VERSION = '0.1.0';

// Export core generator (to be implemented)
export { ScriptGenerator } from './generator.js';

// Export exceptions (to be implemented)
export * from './exceptions.js';
