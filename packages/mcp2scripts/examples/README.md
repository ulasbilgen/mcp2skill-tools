# mcp2scripts Examples

This directory contains example scripts demonstrating various usage patterns of mcp2scripts.

## Prerequisites

Before running these examples:

1. **Install mcp2scripts:**
   ```bash
   npm install -g mcp2scripts
   # or use local build:
   cd .. && npm install && npm run build
   ```

2. **Start mcp2rest:**
   ```bash
   # See mcp2rest documentation for setup
   mcp2rest
   ```

3. **Load MCP servers in mcp2rest:**
   Ensure at least one MCP server is loaded and connected.

## Examples

### 1. Basic Usage (`basic-usage.js`)

Demonstrates fundamental operations:
- Listing available servers
- Getting tools for a server
- Generating a single skill
- Generating all skills

**Run:**
```bash
node basic-usage.js
```

**What it does:**
- Connects to default endpoint (http://localhost:28888)
- Lists all servers
- Gets tools for the first available server
- Generates a skill to `./skills-output`

### 2. Custom Endpoint (`custom-endpoint.js`)

Shows how to work with custom mcp2rest endpoints and handle errors:
- Using custom endpoint URL
- Error handling with MCPConnectionError
- Checking server status
- Custom output directory

**Run:**
```bash
# Use default localhost
node custom-endpoint.js

# Use remote endpoint
MCP_REST_URL=http://192.168.1.100:28888 node custom-endpoint.js

# Custom output directory
SKILLS_OUTPUT=~/my-custom-skills node custom-endpoint.js

# Both
MCP_REST_URL=http://192.168.1.100:28888 SKILLS_OUTPUT=~/my-skills node custom-endpoint.js
```

**What it does:**
- Connects to custom endpoint (via environment variable)
- Tests connection
- Checks status of all servers (connected, disconnected, error)
- Generates all skills to custom directory
- Provides detailed error messages and troubleshooting tips

### 3. TypeScript Usage (`typescript-usage.ts`)

Demonstrates full TypeScript support:
- Type-safe API usage
- Type imports
- Type guards
- Helper functions with types

**Run (with ts-node):**
```bash
# Install ts-node if needed
npm install -g ts-node

# Run TypeScript example
ts-node typescript-usage.ts
```

**Or compile first:**
```bash
# Compile to JavaScript
npx tsc typescript-usage.ts --module es2022 --target es2022

# Run compiled output
node typescript-usage.js
```

**What it does:**
- Shows all available types (`ServerInfo`, `Tool`, `GenerateSkillResult`)
- Implements type-safe filter functions
- Uses type guards for error handling
- Demonstrates full IntelliSense support

## Environment Variables

All examples support these environment variables:

- `MCP_REST_URL` - Override mcp2rest endpoint (default: http://localhost:28888)
- `SKILLS_OUTPUT` - Override output directory (default varies by example)

## Output

Examples will create directories for generated skills:

- `basic-usage.js` → `./skills-output/`
- `custom-endpoint.js` → `./custom-skills/` (or `$SKILLS_OUTPUT`)
- `typescript-usage.ts` → `./typescript-skills/`

Each directory contains:
```
mcp-{server-name}/
├── SKILL.md
└── scripts/
    ├── mcp_client.js
    ├── tool1.js
    ├── tool2.js
    └── ...
```

## Error Handling

All examples demonstrate proper error handling:

### MCPConnectionError

Thrown when mcp2rest is not reachable:
```javascript
try {
  const servers = await gen.listServers();
} catch (error) {
  if (error instanceof MCPConnectionError) {
    console.error('Cannot connect to mcp2rest:', error.message);
    // Provide troubleshooting steps
  }
}
```

### Server Not Found

Thrown when requesting a non-existent server:
```javascript
try {
  const info = await gen.getServerInfo('missing-server');
  if (!info) {
    console.error('Server not found');
  }
} catch (error) {
  console.error('Error:', error.message);
}
```

## Next Steps

After running these examples:

1. **Use generated skills:**
   ```bash
   cd skills-output/mcp-{server-name}/scripts
   node tool-name.js --help
   ```

2. **Copy skills to Claude Code:**
   ```bash
   cp -r skills-output/* ~/.claude/skills/
   ```

3. **Create your own scripts:**
   Use these examples as templates for your own automation scripts.

## Troubleshooting

### "Cannot connect to mcp2rest"

1. Check mcp2rest is running:
   ```bash
   curl http://localhost:28888/health
   ```

2. Verify the endpoint URL is correct

3. Check firewall settings

### "No servers found"

1. List servers in mcp2rest:
   ```bash
   curl http://localhost:28888/servers
   ```

2. Make sure servers are loaded in mcp2rest configuration

3. Check mcp2rest logs for startup errors

### "Module not found"

Make sure mcp2scripts is installed or built:
```bash
cd /path/to/mcp2skill-tools/packages/mcp2scripts
npm install
npm run build
```

## More Information

- [mcp2scripts README](../README.md) - Full documentation
- [API Reference](../README.md#api-reference) - Detailed API docs
- [mcp2rest](../../mcp2rest/README.md) - REST gateway documentation
