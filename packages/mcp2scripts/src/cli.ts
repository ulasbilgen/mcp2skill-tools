#!/usr/bin/env node
/**
 * Command-line interface for mcp2scripts.
 *
 * Generates Claude Code skills from mcp2rest servers with JavaScript scripts.
 */

import { program } from 'commander';
import chalk from 'chalk';
import { ScriptGenerator } from './generator.js';
import { VERSION } from './index.js';
import { MCPConnectionError } from './exceptions.js';

/**
 * List available MCP servers from mcp2rest
 */
async function serversCommand(options: { endpoint: string }): Promise<void> {
  try {
    const gen = new ScriptGenerator(options.endpoint);
    const servers = await gen.listServers();

    if (servers.length === 0) {
      console.log('No servers found in mcp2rest.');
      console.log(`\nMake sure mcp2rest is running at ${options.endpoint}`);
      return;
    }

    console.log(`Available servers in mcp2rest (${options.endpoint}):\n`);

    for (const server of servers) {
      const name = server.name;
      const status = server.status;
      const toolCount = server.toolCount ?? 0;
      const transport = server.transport ?? 'unknown';

      // Color-code status
      let statusColor: typeof chalk.green;
      let statusSymbol: string;

      if (status === 'connected') {
        statusColor = chalk.green;
        statusSymbol = '✓';
      } else if (status === 'disconnected') {
        statusColor = chalk.red;
        statusSymbol = '✗';
      } else {
        statusColor = chalk.yellow;
        statusSymbol = '!';
      }

      console.log(`  ${statusColor(statusSymbol)} ${name}`);
      console.log(`    Status: ${statusColor(status)}`);
      console.log(`    Tools: ${toolCount}`);
      console.log(`    Transport: ${transport}`);

      if (server.package) {
        console.log(`    Package: ${server.package}`);
      } else if (server.url) {
        console.log(`    URL: ${server.url}`);
      }

      console.log();
    }
  } catch (error) {
    if (error instanceof MCPConnectionError) {
      console.error(`Error: ${error.message}`);
    } else {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.constructor.name : 'Error';
      console.error(`Error: ${errorName}: ${errorMsg}`);
    }
    process.exit(1);
  }
}

/**
 * Generate Claude Code skill(s) from MCP server(s)
 */
async function generateCommand(
  serverName: string | undefined,
  options: { all: boolean; output: string; endpoint: string }
): Promise<void> {
  if (!serverName && !options.all) {
    console.error('Error: Must specify SERVER_NAME or use --all flag');
    console.error("\nRun 'mcp2scripts generate --help' for usage info");
    process.exit(1);
  }

  if (serverName && options.all) {
    console.error('Error: Cannot use SERVER_NAME and --all together');
    process.exit(1);
  }

  try {
    const gen = new ScriptGenerator(options.endpoint);

    if (options.all) {
      // Generate for all servers
      console.log('Generating skills for all servers...');
      console.log(`mcp2rest: ${options.endpoint}`);
      console.log(`Output: ${options.output}\n`);

      const results = await gen.generateAllSkills(options.output);

      if (results.length === 0) {
        console.error('No connected servers with tools found.');
        process.exit(1);
      }

      console.log(`\n${chalk.green('✓')} Generated ${results.length} skill(s):`);
      for (const result of results) {
        console.log(`  ${result.skillPath}`);
      }
    } else if (serverName) {
      // Generate for specific server
      console.log(`Generating skill for '${serverName}'...`);
      console.log(`mcp2rest: ${options.endpoint}`);
      console.log(`Output: ${options.output}\n`);

      const result = await gen.generateSkill(serverName, options.output);

      console.log(`${chalk.green('✓')} Generated skill: ${result.skillPath}`);
      console.log(`  SKILL.md: ${result.skillPath}/SKILL.md`);
      console.log(`  Scripts: ${result.toolCount} tools + 1 shared client`);
    }

    console.log(`\n${chalk.bold('Next steps:')}`);
    console.log('  1. Claude Code will auto-discover skills in ~/.claude/skills/');
    console.log('  2. Or manually navigate to skill directory');
    console.log('  3. Run scripts: node scripts/tool_name.js --help');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.constructor.name : 'Error';
    console.error(`Error: ${errorMsg}`);

    if (!(error instanceof MCPConnectionError) && error instanceof Error) {
      console.error(`\n${errorName}:`);
      console.error(error.stack);
    }

    process.exit(1);
  }
}

/**
 * Show tools available on a server
 */
async function toolsCommand(
  serverName: string,
  options: { endpoint: string }
): Promise<void> {
  try {
    const gen = new ScriptGenerator(options.endpoint);

    // Get server info
    const serverInfo = await gen.getServerInfo(serverName);
    if (!serverInfo) {
      console.error(`Error: Server '${serverName}' not found`);
      console.error('\nAvailable servers:');
      const servers = await gen.listServers();
      for (const s of servers) {
        console.error(`  - ${s.name}`);
      }
      process.exit(1);
    }

    // Get tools
    const toolsList = await gen.getTools(serverName);

    console.log(`Tools for '${serverName}' (${toolsList.length} total):\n`);

    for (const tool of toolsList) {
      const name = tool.name;
      const desc = tool.description || 'No description';
      const schema = tool.inputSchema || {};
      const required = schema.required || [];
      const properties = schema.properties || {};

      console.log(`  ${chalk.bold(name)}`);
      console.log(`    ${desc}`);

      if (required.length > 0) {
        console.log(`    Required: ${required.join(', ')}`);
      }

      const optional = Object.keys(properties).filter((p) => !required.includes(p));
      if (optional.length > 0) {
        console.log(`    Optional: ${optional.join(', ')}`);
      }

      console.log();
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMsg}`);
    process.exit(1);
  }
}

// Configure CLI
program
  .name('mcp2scripts')
  .description(
    'Generate Claude Code skills from mcp2rest servers.\n\n' +
      'mcp2scripts queries your local mcp2rest service and generates\n' +
      'SKILL.md files with JavaScript script wrappers for each MCP tool.'
  )
  .version(VERSION);

// servers command
program
  .command('servers')
  .description('List available MCP servers from mcp2rest')
  .option(
    '--endpoint <url>',
    'mcp2rest service URL',
    'http://localhost:28888'
  )
  .action(serversCommand);

// generate command
program
  .command('generate [server-name]')
  .description('Generate Claude Code skill(s) from MCP server(s)')
  .option('--all', 'Generate skills for all connected servers')
  .option('-o, --output <dir>', 'Output directory for generated skills', '~/.claude/skills')
  .option('--endpoint <url>', 'mcp2rest service URL', 'http://localhost:28888')
  .addHelpText(
    'after',
    '\nExamples:\n' +
      '  $ mcp2scripts generate chrome-devtools\n' +
      '  $ mcp2scripts generate --all\n' +
      '  $ mcp2scripts generate chrome-devtools -o ./my-skills\n' +
      '  $ mcp2scripts generate chrome-devtools --endpoint http://192.168.1.100:28888'
  )
  .action(generateCommand);

// tools command
program
  .command('tools <server-name>')
  .description('Show tools available on a server')
  .option('--endpoint <url>', 'mcp2rest service URL', 'http://localhost:28888')
  .addHelpText('after', '\nExample:\n  $ mcp2scripts tools chrome-devtools')
  .action(toolsCommand);

// Parse CLI arguments
program.parse();
