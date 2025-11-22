#!/usr/bin/env node
/**
 * TypeScript usage example for mcp2scripts
 *
 * This example shows:
 * 1. Full TypeScript type support
 * 2. Type-safe API usage
 * 3. Type guards and error handling
 */

import {
  ScriptGenerator,
  MCPConnectionError,
  type ServerInfo,
  type Tool,
  type GenerateSkillResult,
} from 'mcp2scripts';

/**
 * Filter servers by criteria
 */
function filterServers(
  servers: ServerInfo[],
  criteria: {
    status?: 'connected' | 'disconnected' | 'error';
    minTools?: number;
    namePattern?: RegExp;
  }
): ServerInfo[] {
  return servers.filter((server) => {
    // Check status
    if (criteria.status && server.status !== criteria.status) {
      return false;
    }

    // Check minimum tools
    if (criteria.minTools && (server.toolCount ?? 0) < criteria.minTools) {
      return false;
    }

    // Check name pattern
    if (criteria.namePattern && !criteria.namePattern.test(server.name)) {
      return false;
    }

    return true;
  });
}

/**
 * Find tools by name pattern
 */
function findTools(tools: Tool[], pattern: RegExp): Tool[] {
  return tools.filter((tool) => pattern.test(tool.name));
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('=== TypeScript Usage Example ===\n');

  const gen = new ScriptGenerator();

  try {
    // 1. Get servers with type safety
    console.log('1. Listing servers...\n');
    const servers: ServerInfo[] = await gen.listServers();

    // 2. Filter connected servers with at least 5 tools
    console.log('2. Filtering servers (connected, 5+ tools)...\n');
    const qualifiedServers = filterServers(servers, {
      status: 'connected',
      minTools: 5,
    });

    console.log(`Found ${qualifiedServers.length} qualified server(s):\n`);
    for (const server of qualifiedServers) {
      console.log(`  - ${server.name} (${server.toolCount} tools)`);
    }
    console.log();

    if (qualifiedServers.length === 0) {
      console.log('No servers meet criteria.');
      return;
    }

    // 3. Get tools for first qualified server
    const targetServer = qualifiedServers[0];
    console.log(`3. Getting tools for '${targetServer.name}'...\n`);

    const tools: Tool[] = await gen.getTools(targetServer.name);

    // Find navigation-related tools
    const navTools = findTools(tools, /nav|page|go/i);
    console.log(`Navigation tools: ${navTools.length}\n`);
    for (const tool of navTools) {
      console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
    }
    console.log();

    // 4. Generate skill
    console.log(`4. Generating skill...\n`);

    const result: GenerateSkillResult = await gen.generateSkill(
      targetServer.name,
      './typescript-skills'
    );

    console.log('Generated skill:');
    console.log(`  Server: ${result.serverName}`);
    console.log(`  Path: ${result.skillPath}`);
    console.log(`  Tools: ${result.toolCount}`);
    console.log(`  Scripts: ${result.scriptsCreated.join(', ')}\n`);

    console.log('=== Example Complete ===');
  } catch (error) {
    // Type guard for MCPConnectionError
    if (error instanceof MCPConnectionError) {
      console.error('Connection error:', error.message);
    } else if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error(error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    process.exit(1);
  }
}

// Run it
main();
