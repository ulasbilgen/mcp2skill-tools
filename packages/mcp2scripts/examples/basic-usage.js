#!/usr/bin/env node
/**
 * Basic usage example for mcp2scripts
 *
 * This example shows how to:
 * 1. List available MCP servers
 * 2. Get tools for a server
 * 3. Generate a single skill
 * 4. Generate all skills
 */

import { ScriptGenerator } from 'mcp2scripts';

async function main() {
  // Create a generator instance (uses default http://localhost:28888)
  const gen = new ScriptGenerator();

  console.log('=== Basic Usage Example ===\n');

  // 1. List available servers
  console.log('1. Listing available servers...\n');
  const servers = await gen.listServers();

  if (servers.length === 0) {
    console.log('No servers found. Make sure mcp2rest is running.');
    process.exit(1);
  }

  for (const server of servers) {
    console.log(`  ✓ ${server.name} (${server.status})`);
    console.log(`    Tools: ${server.toolCount ?? 0}`);
    console.log(`    Package: ${server.package || server.url || 'N/A'}\n`);
  }

  // 2. Get tools for the first server
  const firstServer = servers[0];
  console.log(`2. Getting tools for '${firstServer.name}'...\n`);

  const tools = await gen.getTools(firstServer.name);
  console.log(`Found ${tools.length} tools:\n`);

  for (const tool of tools.slice(0, 5)) {
    // Show first 5
    console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
  }

  if (tools.length > 5) {
    console.log(`  ... and ${tools.length - 5} more\n`);
  } else {
    console.log();
  }

  // 3. Generate a single skill
  console.log(`3. Generating skill for '${firstServer.name}'...\n`);

  const result = await gen.generateSkill(firstServer.name, './skills-output');

  console.log(`✓ Generated skill:`);
  console.log(`  Path: ${result.skillPath}`);
  console.log(`  Tools: ${result.toolCount}`);
  console.log(`  Scripts: ${result.scriptsCreated.length}\n`);

  // 4. List all connected servers with tools
  const connectedServers = servers.filter(
    (s) => s.status === 'connected' && (s.toolCount ?? 0) > 0
  );

  console.log(`4. Found ${connectedServers.length} connected servers with tools\n`);

  // Uncomment to generate all skills:
  // console.log('Generating all skills...\n');
  // const results = await gen.generateAllSkills('./skills-output');
  // console.log(`✓ Generated ${results.length} skills\n`);

  console.log('=== Example Complete ===');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
