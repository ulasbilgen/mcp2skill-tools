/**
 * Templates for generating SKILL.md and JavaScript scripts.
 *
 * These templates generate executable JavaScript scripts that wrap MCP tools
 * for use with Claude Code skills.
 */

import type { Tool, ServerInfo } from './types.js';
import { generateCommanderFromSchema, generateArgsBuilder, snakeToKebab } from './schema-utils.js';

/**
 * Generate SKILL.md content for a server.
 *
 * @param serverName - Name of the MCP server
 * @param serverInfo - Server information from mcp2rest
 * @param tools - List of tool schemas
 * @param mcp2restUrl - Base URL of mcp2rest service
 * @returns SKILL.md content as string
 */
export function createSkillMd(
  serverName: string,
  serverInfo: ServerInfo,
  tools: Tool[],
  mcp2restUrl: string
): string {
  const toolCount = tools.length;
  const pkg = serverInfo.package || serverInfo.url || 'N/A';

  // Categorize tools if possible
  const categories = categorizeTools(tools);

  // Generate tool listing
  const toolList = generateToolList(tools, categories);

  // Generate example workflows
  const workflows = generateExampleWorkflows(serverName, tools);

  const description = generateDescription(serverName, serverInfo, toolCount);
  const intro = generateIntro(serverName, serverInfo);
  const serverVersion = serverInfo.serverVersion?.version || 'unknown';

  return `---
name: mcp-${serverName}
description: ${description}
server-version: ${serverVersion}
---

# ${serverName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} MCP Server

${intro}

## Prerequisites
- Node.js 18+ installed
- mcp2rest running on ${mcp2restUrl}
- ${serverName} server loaded in mcp2rest
- Package: \`${pkg}\`

## Quick Start

\`\`\`bash
# Navigate to the skill scripts directory
cd scripts/

# Install dependencies (first time only)
npm install

# Example: List available options
node ${tools[0]?.name || 'tool'}.js --help
\`\`\`

## Available Tools

${toolList}

## State Persistence

This server maintains state between calls (managed by mcp2rest):
- Sequential commands interact with the same server instance
- State persists until server restart
- Multiple scripts can access shared state

${workflows}

## Troubleshooting

If you get connection errors:
1. Check mcp2rest is running: \`curl ${mcp2restUrl}/health\`
2. Verify server is loaded: \`curl ${mcp2restUrl}/servers\`
3. Check server status in the list

For tool-specific errors, use \`--help\` flag on any script.
`;
}

/**
 * Generate concise skill description.
 */
function generateDescription(serverName: string, _serverInfo: ServerInfo, toolCount: number): string {
  const nameLower = serverName.toLowerCase();

  if (nameLower.includes('chrome') || nameLower.includes('browser')) {
    return `Browser automation and DevTools control (${toolCount} tools)`;
  } else if (nameLower.includes('figma')) {
    return `Figma design tool integration (${toolCount} tools)`;
  } else if (nameLower.includes('filesystem') || nameLower.includes('file')) {
    return `File system operations (${toolCount} tools)`;
  } else if (nameLower.includes('weather')) {
    return `Weather data and forecasts (${toolCount} tools)`;
  } else {
    return `MCP server with ${toolCount} tools`;
  }
}

/**
 * Generate introduction paragraph.
 */
function generateIntro(serverName: string, _serverInfo: ServerInfo): string {
  const nameLower = serverName.toLowerCase();

  if (nameLower.includes('chrome')) {
    return 'Control Chrome browser programmatically via the Chrome DevTools Protocol. Navigate pages, interact with elements, take screenshots, and more.';
  } else if (nameLower.includes('figma')) {
    return 'Interact with Figma designs, extract design tokens, and automate design workflows.';
  } else {
    return `Access ${serverName} functionality via REST API.`;
  }
}

/**
 * Categorize tools by common patterns.
 */
function categorizeTools(tools: Tool[]): Record<string, Tool[]> {
  const categories: Record<string, Tool[]> = {
    'Page Management': [],
    'Element Interaction': [],
    'Inspection': [],
    'Network': [],
    'Performance': [],
    'Other': [],
  };

  for (const tool of tools) {
    const name = tool.name.toLowerCase();

    if (['page', 'navigate', 'new_', 'list_pages', 'select_page', 'close_page'].some((kw) => name.includes(kw))) {
      categories['Page Management']?.push(tool);
    } else if (['click', 'fill', 'hover', 'drag', 'press', 'upload'].some((kw) => name.includes(kw))) {
      categories['Element Interaction']?.push(tool);
    } else if (['snapshot', 'screenshot', 'console', 'get_'].some((kw) => name.includes(kw))) {
      categories['Inspection']?.push(tool);
    } else if (['network', 'request'].some((kw) => name.includes(kw))) {
      categories['Network']?.push(tool);
    } else if (['performance', 'trace', 'insight'].some((kw) => name.includes(kw))) {
      categories['Performance']?.push(tool);
    } else {
      categories['Other']?.push(tool);
    }
  }

  // Remove empty categories
  return Object.fromEntries(Object.entries(categories).filter(([_, catTools]) => catTools.length > 0));
}

/**
 * Generate formatted tool listing.
 */
function generateToolList(_tools: Tool[], categories: Record<string, Tool[]>): string {
  const sections: string[] = [];

  for (const [category, catTools] of Object.entries(categories)) {
    const lines = [`### ${category}\n`];

    for (const tool of catTools) {
      const schema = tool.inputSchema || {};
      const required = schema.required || [];
      const properties = schema.properties || {};

      // Build arg string
      const args: string[] = [];
      for (const propName of required) {
        args.push(`--${snakeToKebab(propName)} ${propName.toUpperCase()}`);
      }

      // Add optional args indicator
      const optionalCount = Object.keys(properties).length - required.length;
      if (optionalCount > 0) {
        args.push(`[${optionalCount} optional]`);
      }

      const argStr = args.join(' ');
      const desc = tool.description || 'No description';
      lines.push(`- \`${tool.name}.js ${argStr}\` - ${desc}`);
    }

    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Generate example workflow section.
 */
function generateExampleWorkflows(_serverName: string, tools: Tool[]): string {
  const toolNames = tools.map((t) => t.name);

  // Chrome DevTools workflows
  if (toolNames.includes('new_page') && toolNames.includes('click')) {
    return `## Example Workflows

### Navigate and Interact

\`\`\`bash
# 1. Open a page
node new_page.js --url https://example.com

# 2. Take snapshot to see element UIDs
node take_snapshot.js

# 3. Click an element (use UID from snapshot)
node click.js --uid button_123
\`\`\`

### Fill and Submit Form

\`\`\`bash
# 1. Navigate to form
node new_page.js --url https://example.com/form

# 2. Get element UIDs
node take_snapshot.js

# 3. Fill form fields
node fill.js --uid email_field --value user@example.com
node fill.js --uid password_field --value secret

# 4. Submit
node click.js --uid submit_button
\`\`\`

### Take Screenshot

\`\`\`bash
node new_page.js --url https://example.com
node take_screenshot.js --format png
\`\`\``;
  }

  return `## Example Usage

\`\`\`bash
# List available tools
ls scripts/

# Get help for specific tool
node scripts/tool_name.js --help

# Run a tool
node scripts/tool_name.js --arg value
\`\`\``;
}

/**
 * Generate package.json for the skill scripts directory.
 *
 * Creates a package.json that defines the skill as an ES module project
 * with required dependencies for the generated scripts.
 *
 * @param serverName - Name of the MCP server
 * @returns package.json content as string
 */
export function createPackageJson(serverName: string): string {
  const packageObj = {
    name: `mcp-${serverName}-skill`,
    version: '1.0.0',
    description: `Claude Code skill scripts for ${serverName} MCP server`,
    type: 'module',
    dependencies: {
      axios: '^1.6.2',
      commander: '^11.1.0',
    },
    keywords: ['mcp', 'claude-code', 'skill', serverName],
    author: '',
    license: 'MIT',
  };

  return JSON.stringify(packageObj, null, 2) + '\n';
}

/**
 * Generate shared mcp_client.js utility script.
 *
 * This script is used by all generated tool scripts to call mcp2rest.
 *
 * @param mcp2restUrl - Base URL of mcp2rest service
 * @param serverName - Name of the MCP server
 * @param serverVersion - Version of the MCP server
 * @param generationDate - Date of generation (ISO format)
 * @returns JavaScript code for mcp_client.js
 */
export function createMcpClientScript(
  mcp2restUrl: string,
  serverName: string,
  serverVersion: string,
  generationDate: string
): string {
  const genDate = generationDate.split('T')[0]; // Extract YYYY-MM-DD
  return `#!/usr/bin/env node
/**
 * MCP REST Client for ${serverName}
 * Server Version: ${serverVersion}
 * Generated: ${genDate}
 *
 * Shared MCP REST client for tool scripts.
 */

import axios from 'axios';

// MCP2REST endpoint (configurable via environment variable)
const MCP_REST_URL = process.env.MCP_REST_URL || '${mcp2restUrl}';

/**
 * Call an MCP tool via mcp2rest REST API.
 *
 * @param {string} server - Server name (e.g., "chrome-devtools")
 * @param {string} tool - Tool name (e.g., "click")
 * @param {object} args - Tool arguments as object
 * @returns {Promise<string>} Tool result as formatted string
 */
export async function callTool(server, tool, args) {
  const url = \`\${MCP_REST_URL}/call\`;
  const payload = {
    server,
    tool,
    arguments: args || {},
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const data = response.data;

    if (data.success) {
      // Extract and format result
      const result = data.result || {};
      const content = result.content || [];

      // Format output nicely
      const outputParts = [];
      for (const item of content) {
        if (item.type === 'text') {
          outputParts.push(item.text || '');
        } else if (item.type === 'image') {
          // For images, just note their presence
          const dataLen = (item.data || '').length;
          outputParts.push(\`[Image data: \${dataLen} bytes]\`);
        } else if (item.type === 'resource') {
          outputParts.push(JSON.stringify(item.resource || {}, null, 2));
        }
      }

      return outputParts.length > 0 ? outputParts.join('\\n') : JSON.stringify(result, null, 2);
    } else {
      const error = data.error || {};
      const errorMsg = error.message || 'Unknown error';
      const errorCode = error.code || 'UNKNOWN';
      console.error(\`Error [\${errorCode}]: \${errorMsg}\`);
      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(\`Error: Cannot connect to mcp2rest at \${MCP_REST_URL}\`);
      console.error('Make sure mcp2rest is running.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('Error: Request timed out after 30 seconds');
    } else if (error.response) {
      console.error(\`Error: HTTP \${error.response.status} - \${error.response.data}\`);
    } else {
      console.error(\`Error: \${error.message}\`);
    }
    process.exit(1);
  }
}
`;
}

/**
 * Generate JavaScript script for a tool.
 *
 * Creates an executable Node.js script that uses commander for CLI parsing
 * and calls the mcp_client to execute the tool.
 *
 * @param serverName - Name of the MCP server
 * @param tool - Tool schema
 * @param serverVersion - Version of the MCP server
 * @param generationDate - Date of generation (ISO format)
 * @returns JavaScript code for the tool script
 */
export function createToolScript(
  serverName: string,
  tool: Tool,
  serverVersion: string,
  generationDate: string
): string {
  const toolName = tool.name;
  const description = tool.description || `Execute ${toolName} tool`;
  const schema = tool.inputSchema || {};
  const genDate = generationDate.split('T')[0]; // Extract YYYY-MM-DD

  // Generate commander options code
  const commanderOptions = generateCommanderFromSchema(schema);

  // Generate args builder code
  const argsBuilder = generateArgsBuilder(schema);

  // Escape description for use in code
  const escapedDesc = description.replace(/'/g, "\\'").replace(/\n/g, '\\n');

  return `#!/usr/bin/env node
/**
 * MCP Server: ${serverName}
 * Server Version: ${serverVersion}
 * Generated: ${genDate}
 * Tool: ${toolName}
 *
 * ${description}
 */

import { program } from 'commander';
import { callTool } from './mcp_client.js';

program
  .name('${toolName}')
  .description('${escapedDesc}')
${commanderOptions}
  .parse();

const options = program.opts();

${argsBuilder}

// Call the tool
try {
  const result = await callTool('${serverName}', '${toolName}', args);
  console.log(result);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
`;
}
