# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mcp2skill-tools is a monorepo for MCP (Model Context Protocol) tooling that enables MCP server integration with Claude Code. It contains three packages that work together to run MCP servers, expose them via REST API, and generate executable skills.

**Core workflow:** mcp2rest (manages MCP servers) → mcp2scripts (generates JavaScript skills) → Claude Code (auto-discovers and uses skills)

## Monorepo Structure

```
packages/
├── mcp2rest/           - REST API gateway for MCP servers (Node.js daemon)
├── mcp2scripts/        - JavaScript skill generator from MCP tools (CLI + library)
└── mcp2skill-commands/ - Claude Code slash commands for interactive skill generation
```

## Build and Development Commands

### Root Level (All Packages)

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests for all packages (note: mcp2rest has no tests yet)
npm run test

# Clean all build artifacts
npm run clean
```

### Package-Specific Development

```bash
# mcp2rest - REST API gateway
cd packages/mcp2rest
npm run build          # Build TypeScript to dist/
npm run dev            # Run in development mode with ts-node
npm start              # Start compiled version

# mcp2scripts - Skill generator
cd packages/mcp2scripts
npm run build          # Build TypeScript to dist/
npm run dev            # Watch mode compilation
npm test               # Run Vitest tests
npm run test:ui        # Run tests with UI
npm run test:coverage  # Generate coverage report
npm run lint           # Run ESLint
npm run format         # Format with Prettier

# Run CLI locally (after build)
node dist/cli.js servers
node dist/cli.js generate chrome-devtools
```

### Running Individual Tests

```bash
# Run single test file
cd packages/mcp2scripts
npx vitest tests/generator.test.ts

# Run tests matching pattern
npx vitest tests/schema-utils
```

## Key Architecture Patterns

### State Management Philosophy

The architecture separates **stateful** and **stateless** components:

- **mcp2rest** maintains all persistent state (MCP server processes, browser sessions, database connections)
- **mcp2scripts** is stateless - generates scripts that make REST calls
- **Generated skills** are stateless - just wrappers around REST API calls

This design enables sequential operations (navigate → click → screenshot) to work naturally because state persists in the mcp2rest daemon between calls.

### mcp2rest: Server Lifecycle Management

Located in `packages/mcp2rest/src/gateway/Gateway.ts`:

- Each MCP server runs as separate process spawned via `npx <package> [...args]`
- Uses `StdioClientTransport` from `@modelcontextprotocol/sdk` for stdio communication
- Maintains `Map<string, ServerState>` for all server connections
- Tool execution uses Promise.race pattern for configurable timeout (default 30s)
- Error codes prefixed with enum values (e.g., `SERVER_NOT_FOUND:`) for standardized HTTP status mapping

### mcp2scripts: Code Generation Pipeline

Located in `packages/mcp2scripts/src/`:

1. **generator.ts** - Core ScriptGenerator class
   - Queries mcp2rest REST API for server/tool metadata
   - Orchestrates skill directory creation
   - Uses templates to generate files

2. **templates.ts** - JavaScript code generation
   - Converts tool schemas to Commander.js CLI definitions
   - Generates executable scripts with `#!/usr/bin/env node` shebang
   - Auto-categorizes tools by domain (browser, filesystem, etc.)
   - Creates SKILL.md with progressive disclosure for complex skills

3. **schema-utils.ts** - JSON Schema to CLI mapping
   - Converts JSON Schema properties to Commander options
   - Handles required field validation
   - Maps types: string, number, boolean, object (JSON parsing)
   - Generates kebab-case option names from snake_case

### Type System Consistency

All TypeScript interfaces defined in `src/types.ts` for each package:
- **mcp2rest**: `ServerConfig`, `ServerState`, `GatewayConfig`, `Tool`, `ErrorCode`
- **mcp2scripts**: `ServerInfo`, `Tool`, `JsonSchema`, `GenerateSkillResult`

JSON Schema is used heavily for MCP tool input validation and CLI option generation.

## Testing Strategy

### mcp2scripts Test Structure

Located in `packages/mcp2scripts/tests/`:

- **Unit tests**: `schema-utils.test.ts`, `utils.test.ts`, `exceptions.test.ts`
- **Integration tests**: `generator.test.ts`, `integration.test.ts`
- **Mocking**: Uses Vitest vi.mock() for axios and fs/promises
- **Coverage**: Run `npm run test:coverage` for reports

Test pattern: Mock HTTP responses from mcp2rest, verify generated file contents via fs.writeFile mock calls.

### mcp2rest Testing

Currently no test suite (test script missing). When adding tests, follow this pattern:
- Mock `@modelcontextprotocol/sdk` Client and Transport
- Test Gateway server lifecycle independently from API layer
- Mock child_process.spawn for server process creation
- Use supertest for Express API endpoint testing

## Configuration Management

### mcp2rest Configuration

Default location: `~/.mcp2rest/config.yaml`

```yaml
servers:
  <server-name>:
    package: <npm-package>  # For stdio servers
    args: [<args>]
    # OR
    url: <http-url>        # For HTTP servers

gateway:
  port: 3000
  host: localhost
  timeout: 30000
  logLevel: info
```

Managed by `ConfigManager` class (`src/config/ConfigManager.ts`):
- Auto-creates default config if missing
- Validates server configurations
- Provides CRUD operations for servers
- All changes persisted immediately

### PM2 Service Management

Configuration: `packages/mcp2rest/ecosystem.config.js`
- Service name: `mcp2rest`
- Logs: `~/.mcp2rest/logs/`
- Auto-restart enabled
- Memory limit: 500M

CLI commands use PM2 for daemon mode, PID files for foreground mode.

## Generated Skill Structure

### Simple Skills (≤10 tools)
```
~/.claude/skills/mcp-{server-name}/
├── SKILL.md              # ~150-300 lines
└── scripts/
    ├── mcp_client.js     # Shared REST client (env: MCP_REST_URL)
    └── tool*.js          # Commander.js CLI wrappers
```

### Complex Skills (>10 tools)
```
~/.claude/skills/mcp-{server-name}/
├── SKILL.md              # Overview + quick start (~300-500 lines)
├── scripts/              # All tool scripts
├── workflows/            # Common workflow examples
└── reference/            # Progressive disclosure docs
```

## Package Publishing

All three packages are publishable:

```bash
# Prepare for publishing (runs automatically on npm publish)
cd packages/mcp2rest
npm run prepublishOnly  # Builds TypeScript

cd packages/mcp2scripts
npm run prepublishOnly  # Cleans and rebuilds

# Publish (when ready)
npm publish
```

Files included in published packages defined in `package.json` "files" array.

## Important Implementation Notes

### mcp2rest
- Never update git config or run destructive operations
- Server processes spawned with stdio pipes for MCP communication
- PID files prevent foreground/service mode conflicts
- All API endpoints return standardized JSON with error codes
- HTTP endpoints: `/call`, `/servers`, `/servers/:name/tools`, `/health`

### mcp2scripts
- Uses ES modules (`"type": "module"` in package.json)
- Generated scripts use `import` syntax (not require)
- Environment variable `MCP_REST_URL` overrides hardcoded endpoint at runtime
- Tool categorization heuristics in templates.ts (domain detection from names)
- Commander.js used (not argparse) for JavaScript CLI generation

### mcp2skill-commands
- Slash commands reference `@docs/skill-authoring-guide.md` (not in monorepo)
- Commands designed for interactive Claude Code workflows
- Guides users through: init → add → list → generate → update
- Integration with both mcp2rest and mcp2scripts packages

## Common Development Tasks

### Adding a new MCP server for testing
```bash
cd packages/mcp2rest
npm run dev  # Start in foreground

# In another terminal
curl -X POST http://localhost:28888/servers \
  -H "Content-Type: application/json" \
  -d '{"name":"test-server","package":"@modelcontextprotocol/server-filesystem"}'
```

### Testing skill generation locally
```bash
cd packages/mcp2scripts
npm run build

# Generate skill (requires mcp2rest running)
node dist/cli.js generate chrome-devtools -o /tmp/test-skills
ls /tmp/test-skills/mcp-chrome-devtools/
```

### Debugging generated scripts
```bash
cd ~/.claude/skills/mcp-{server-name}/scripts

# Check generated CLI
node tool-name.js --help

# Run with MCP_REST_URL override
MCP_REST_URL=http://192.168.1.100:28888 node tool-name.js --arg value
```

## Migration Notes

This monorepo represents a migration from Python to JavaScript:
- **Old**: Python `mcp2skill` package (deprecated)
- **New**: JavaScript `mcp2scripts` package
- **Change**: Generated scripts are JavaScript (was Python with argparse)
- **Compatibility**: Workflow and functionality remain the same

See `packages/mcp2scripts/MIGRATION.md` for detailed migration guide.
