#!/usr/bin/env node
/**
 * Custom endpoint example for mcp2scripts
 *
 * This example shows how to:
 * 1. Use a custom mcp2rest endpoint
 * 2. Handle connection errors
 * 3. Check server status
 * 4. Generate skills with custom output directory
 */

import { ScriptGenerator, MCPConnectionError } from 'mcp2scripts';

async function main() {
  console.log('=== Custom Endpoint Example ===\n');

  // Use custom endpoint (e.g., remote mcp2rest instance)
  const customEndpoint = process.env.MCP_REST_URL || 'http://localhost:28888';
  console.log(`Connecting to: ${customEndpoint}\n`);

  const gen = new ScriptGenerator(customEndpoint);

  try {
    // 1. Test connection by listing servers
    console.log('1. Testing connection...\n');
    const servers = await gen.listServers();

    console.log(`✓ Connected successfully`);
    console.log(`Found ${servers.length} server(s)\n`);

    // 2. Check for connected servers
    console.log('2. Checking server status...\n');

    const connected = servers.filter((s) => s.status === 'connected');
    const disconnected = servers.filter((s) => s.status === 'disconnected');
    const error = servers.filter((s) => s.status === 'error');

    console.log(`  Connected: ${connected.length}`);
    console.log(`  Disconnected: ${disconnected.length}`);
    console.log(`  Error: ${error.length}\n`);

    if (connected.length === 0) {
      console.log('No connected servers found.');
      console.log('Make sure at least one MCP server is loaded in mcp2rest.\n');
      return;
    }

    // 3. Get server info
    console.log('3. Getting detailed server info...\n');

    for (const server of connected) {
      const info = await gen.getServerInfo(server.name);
      console.log(`  ${info.name}:`);
      console.log(`    Status: ${info.status}`);
      console.log(`    Tools: ${info.toolCount ?? 0}`);
      console.log(`    Transport: ${info.transport ?? 'unknown'}`);
      console.log();
    }

    // 4. Generate skills to custom directory
    const outputDir = process.env.SKILLS_OUTPUT || './custom-skills';
    console.log(`4. Generating skills to '${outputDir}'...\n`);

    const results = await gen.generateAllSkills(outputDir);

    console.log(`✓ Generated ${results.length} skill(s):\n`);

    for (const result of results) {
      console.log(`  ${result.serverName}:`);
      console.log(`    Path: ${result.skillPath}`);
      console.log(`    Tools: ${result.toolCount}`);
      console.log();
    }

    console.log('=== Example Complete ===');
  } catch (error) {
    if (error instanceof MCPConnectionError) {
      // Connection error - mcp2rest not available
      console.error('❌ Connection Error:\n');
      console.error(`  ${error.message}\n`);
      console.error('Troubleshooting:');
      console.error(`  1. Check mcp2rest is running at ${customEndpoint}`);
      console.error('  2. Verify endpoint URL is correct');
      console.error('  3. Check firewall/network settings');
      console.error('  4. Try: curl ${customEndpoint}/health\n');
    } else {
      // Other error
      console.error('❌ Error:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

// Run with custom endpoint:
// MCP_REST_URL=http://192.168.1.100:28888 node custom-endpoint.js
//
// Or with custom output:
// SKILLS_OUTPUT=~/my-skills node custom-endpoint.js

main();
