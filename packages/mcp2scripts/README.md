# mcp2scripts

Generate JavaScript scripts from MCP Server Tools for Claude Code Skills.

`mcp2scripts` queries your local [mcp2rest](https://github.com/yourusername/mcp2rest) service and generates executable JavaScript scripts for each MCP tool, packaged as [Claude Code skills](https://docs.anthropic.com/claude/docs/claude-code).

## Features

- **Zero-config skill generation** - Generate skills with a single command
- **Full MCP protocol support** - Works with any MCP server via mcp2rest
- **Type-safe CLI generation** - Converts JSON Schema to commander.js options
- **Interactive help** - Every tool script includes `--help` documentation
- **State management** - Scripts share server state through mcp2rest
- **Categorized tools** - Automatically organizes tools by functionality

## Installation

```bash
npm install -g mcp2scripts
```

Or use with npx:

```bash
npx mcp2scripts servers
```

## Prerequisites

1. **Node.js** >= 18.0.0
2. **mcp2rest** service running (default: http://localhost:28888)
   - See [mcp2rest documentation](../mcp2rest/README.md) for setup

## Quick Start

```bash
# 1. List available MCP servers
mcp2scripts servers

# 2. Generate skill for a specific server
mcp2scripts generate chrome-devtools

# 3. Skills are created in ~/.claude/skills/mcp-{server-name}/
# 4. Claude Code automatically discovers skills in this directory
```

## CLI Usage

### List Servers

Show all MCP servers loaded in mcp2rest:

```bash
mcp2scripts servers

# Use custom mcp2rest endpoint
mcp2scripts servers --endpoint http://192.168.1.100:28888
```

**Output:**
```
Available servers in mcp2rest (http://localhost:28888):

  ✓ chrome-devtools
    Status: connected
    Tools: 15
    Transport: stdio
    Package: @modelcontextprotocol/server-chrome-devtools

  ✓ filesystem
    Status: connected
    Tools: 8
    Transport: stdio
    Package: @modelcontextprotocol/server-filesystem
```

### Generate Skills

Generate a skill for a specific server:

```bash
# Generate skill for chrome-devtools
mcp2scripts generate chrome-devtools

# Generate to custom directory
mcp2scripts generate chrome-devtools -o ./my-skills

# Generate skills for all connected servers
mcp2scripts generate --all

# Use custom mcp2rest endpoint
mcp2scripts generate chrome-devtools --endpoint http://192.168.1.100:28888
```

**Output:**
```
Generating skill for 'chrome-devtools'...
mcp2rest: http://localhost:28888
Output: ~/.claude/skills

✓ Generated skill: ~/.claude/skills/mcp-chrome-devtools
  SKILL.md: ~/.claude/skills/mcp-chrome-devtools/SKILL.md
  Scripts: 15 tools + 1 shared client

Next steps:
  1. Claude Code will auto-discover skills in ~/.claude/skills/
  2. Or manually navigate to skill directory
  3. Run scripts: node scripts/tool_name.js --help
```

### List Tools

Show tools available on a server:

```bash
mcp2scripts tools chrome-devtools
```

**Output:**
```
Tools for 'chrome-devtools' (15 total):

  navigate
    Navigate to a URL in the current page
    Required: url

  click
    Click an element on the page
    Required: selector

  screenshot
    Take a screenshot of the page
    Optional: fullPage
```

## Generated Skill Structure

```
~/.claude/skills/mcp-{server-name}/
├── SKILL.md              # Skill documentation
└── scripts/
    ├── mcp_client.js     # Shared REST client
    ├── tool1.js          # Generated script for tool1
    ├── tool2.js          # Generated script for tool2
    └── ...
```

### SKILL.md

Contains:
- YAML frontmatter with skill metadata
- Tool categorization (Page Management, Inspection, etc.)
- Usage examples
- Troubleshooting tips

### Tool Scripts

Each tool gets an executable JavaScript script with:
- `#!/usr/bin/env node` shebang
- Commander.js CLI with `--help` support
- Type-safe argument parsing (JSON Schema → CLI options)
- Required field validation
- JSON parsing for complex types
- Error handling

**Example generated script:**

```javascript
#!/usr/bin/env node
import { program } from 'commander';
import { callTool } from './mcp_client.js';

program
  .name('navigate')
  .description('Navigate to a URL in the current page')
  .option('--url <value>', 'URL to navigate to (string)')
  .parse();

const options = program.opts();

if (!options.url) {
  console.error('Error: --url is required');
  process.exit(1);
}

const args = {
  url: options.url,
};

const result = await callTool('chrome-devtools', 'navigate', args);
console.log(result);
```

## Programmatic API

You can also use mcp2scripts as a library:

```javascript
import { ScriptGenerator } from 'mcp2scripts';

const gen = new ScriptGenerator('http://localhost:28888');

// List servers
const servers = await gen.listServers();
console.log(servers);

// Get tools for a server
const tools = await gen.getTools('chrome-devtools');
console.log(tools);

// Generate skill
const result = await gen.generateSkill('chrome-devtools', '~/.claude/skills');
console.log(`Generated ${result.toolCount} tools at ${result.skillPath}`);

// Generate all skills
const results = await gen.generateAllSkills('~/.claude/skills');
console.log(`Generated ${results.length} skills`);
```

### API Reference

#### `new ScriptGenerator(mcp2restUrl?: string)`

Create a new script generator.

- `mcp2restUrl` - Base URL of mcp2rest service (default: `http://localhost:28888`)

#### `async listServers(): Promise<ServerInfo[]>`

Get all servers from mcp2rest.

Returns array of server info objects:
```typescript
{
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  toolCount?: number;
  transport?: string;
  package?: string;
  url?: string;
}
```

Throws `MCPConnectionError` if cannot connect to mcp2rest.

#### `async getTools(serverName: string): Promise<Tool[]>`

Get tool schemas for a server.

Returns array of tool objects:
```typescript
{
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}
```

Throws `Error` if server not found.

#### `async generateSkill(serverName: string, outputDir?: string): Promise<GenerateSkillResult>`

Generate a Claude Code skill for an MCP server.

- `serverName` - Name of the MCP server
- `outputDir` - Output directory (default: `~/.claude/skills`)

Returns:
```typescript
{
  skillPath: string;        // Path to generated skill directory
  serverName: string;       // Name of server
  toolCount: number;        // Number of tools generated
  scriptsCreated: string[]; // List of script filenames
}
```

#### `async generateAllSkills(outputDir?: string): Promise<GenerateSkillResult[]>`

Generate skills for all connected servers with tools.

Returns array of `GenerateSkillResult` objects.

## Configuration

### Environment Variables

- `MCP_REST_URL` - Override mcp2rest endpoint in generated scripts

**Example:**
```bash
# Generate skill with default endpoint
mcp2scripts generate chrome-devtools

# Later, override at runtime
MCP_REST_URL=http://192.168.1.100:28888 node scripts/navigate.js --url https://example.com
```

### Custom mcp2rest Endpoint

Use the `--endpoint` flag with any command:

```bash
mcp2scripts servers --endpoint http://custom-host:8080
mcp2scripts generate chrome-devtools --endpoint http://custom-host:8080
```

## Using Generated Skills

### With Claude Code

Claude Code automatically discovers skills in `~/.claude/skills/`:

1. Generate skills: `mcp2scripts generate --all`
2. Start Claude Code
3. Skills are available immediately

### Manual Usage

Run tool scripts directly:

```bash
cd ~/.claude/skills/mcp-chrome-devtools/scripts

# Get help
node navigate.js --help

# Navigate to URL
node navigate.js --url https://example.com

# Take screenshot
node screenshot.js --full-page

# Click element
node click.js --selector "#login-button"
```

### Chaining Commands

All scripts use the same server instance (via mcp2rest):

```bash
# Navigate to page
node navigate.js --url https://github.com

# Fill in search box
node fill.js --selector "input[name=q]" --value "mcp2scripts"

# Submit form
node click.js --selector "button[type=submit]"

# Take screenshot
node screenshot.js --full-page
```

## Troubleshooting

### "Cannot connect to mcp2rest"

1. Check mcp2rest is running:
   ```bash
   curl http://localhost:28888/health
   ```

2. Verify correct endpoint:
   ```bash
   mcp2scripts servers --endpoint http://localhost:28888
   ```

3. Check firewall settings if using remote endpoint

### "Server not found"

1. List available servers:
   ```bash
   mcp2scripts servers
   ```

2. Verify server name matches exactly (case-sensitive)

3. Check server is connected (not disconnected)

### "No tools available"

1. Check server status:
   ```bash
   mcp2scripts tools server-name
   ```

2. Verify server has initialized properly in mcp2rest

3. Check server logs for initialization errors

### Script Errors

1. Use `--help` to see required arguments:
   ```bash
   node scripts/tool-name.js --help
   ```

2. Check argument types (string, number, boolean, object)

3. For object arguments, provide valid JSON:
   ```bash
   node configure.js --settings '{"theme":"dark","timeout":5000}'
   ```

## Examples

### Example 1: Browser Automation

```bash
# Generate chrome-devtools skill
mcp2scripts generate chrome-devtools

cd ~/.claude/skills/mcp-chrome-devtools/scripts

# Navigate to page
node navigate.js --url https://example.com

# Take screenshot
node screenshot.js --full-page

# Get console logs
node get_console_logs.js
```

### Example 2: File System Operations

```bash
# Generate filesystem skill
mcp2scripts generate filesystem

cd ~/.claude/skills/mcp-filesystem/scripts

# List directory
node list_directory.js --path /tmp

# Read file
node read_file.js --path /tmp/test.txt

# Write file
node write_file.js --path /tmp/output.txt --content "Hello World"
```

### Example 3: Multi-Server Workflow

```bash
# Generate all skills
mcp2scripts generate --all

# Use browser to fetch data
cd ~/.claude/skills/mcp-chrome-devtools/scripts
node navigate.js --url https://api.example.com/data.json
node screenshot.js --full-page > data.png

# Save to file
cd ~/.claude/skills/mcp-filesystem/scripts
node write_file.js --path /tmp/data.png --content-from-stdin < ~/data.png
```

## Development

```bash
# Clone repository
git clone https://github.com/yourusername/mcp2skill-tools.git
cd mcp2skill-tools/packages/mcp2scripts

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run CLI locally
node dist/cli.js servers
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type { ServerInfo, Tool, JsonSchema, GenerateSkillResult } from 'mcp2scripts';
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md).

## License

MIT License - see [LICENSE](../../LICENSE)

## Related Projects

- [mcp2rest](../mcp2rest) - REST API gateway for MCP servers
- [Model Context Protocol](https://github.com/anthropics/mcp) - Official MCP specification
- [Claude Code](https://docs.anthropic.com/claude/docs/claude-code) - AI coding assistant

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.
