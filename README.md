# mcp2skill-tools

Monorepo for MCP (Model Context Protocol) tooling suite.

## Packages

This monorepo contains three packages that work together to enable MCP server integration with Claude Code:

### 📦 [mcp2rest](./packages/mcp2rest/)

REST API gateway for MCP servers. Runs MCP servers as persistent processes and exposes their tools via a REST API.

- **Purpose**: Run and manage MCP servers with HTTP access
- **Key features**: Server lifecycle management, REST API endpoints, persistent state
- **Default port**: 28888
- **Status**: Production ready

### 📦 [mcp2scripts](./packages/mcp2scripts/)

Generate JavaScript scripts from MCP Server Tools for Claude Code Skills to use.

- **Purpose**: Convert MCP tools into executable scripts
- **Key features**: Auto-generates JavaScript wrappers, commander-based CLI, skill documentation
- **Generated scripts**: JavaScript (Node.js)
- **Status**: In development (converting from Python mcp2skill)

### 📦 [mcp2skill-commands](./packages/mcp2skill-commands/)

Claude Code slash commands for interactive skill generation and management.

- **Purpose**: Interactive skill creation workflow
- **Key features**: `/m2s:init`, `/m2s:generate`, `/m2s:update`, `/m2s:list`, `/m2s:add`
- **Includes**: Skill authoring best practices guide
- **Status**: Production ready

## Quick Start

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test
```

## Workflow

```
┌─────────────┐
│  mcp2rest   │  ← Manages MCP servers, exposes REST API
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ mcp2scripts │  ← Generates JavaScript scripts from MCP tools
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Claude Code  │  ← Uses generated skills automatically
│   Skills    │
└─────────────┘
```

## Installation

Each package can be installed independently:

```bash
# mcp2rest - Install globally to run MCP servers
npm install -g mcp2rest

# mcp2scripts - Install globally to generate skills
npm install -g mcp2scripts

# mcp2skill-commands - Install in Claude Code project
# Copy .claude/commands/m2s/ to your project
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/ulasbilgen/mcp2skill-tools.git
cd mcp2skill-tools

# Install dependencies for all packages
npm install

# Build all packages
npm run build
```

### Working with packages

Each package can be developed independently:

```bash
# Work on mcp2rest
cd packages/mcp2rest
npm run dev

# Work on mcp2scripts
cd packages/mcp2scripts
npm run dev

# Test a specific package
cd packages/mcp2scripts
npm test
```

## Architecture

### mcp2rest → mcp2scripts → Claude Code Skills

1. **mcp2rest** runs MCP servers and exposes tools via REST API
2. **mcp2scripts** queries mcp2rest, generates JavaScript scripts for each tool
3. **Claude Code** auto-discovers skills from `~/.claude/skills/` or `./.claude/skills/`
4. Generated scripts call mcp2rest REST API to execute MCP tools

### State Management

- **Persistent state**: Maintained by mcp2rest (browser sessions, database connections, etc.)
- **Stateless scripts**: Generated scripts just make REST calls
- **Sequential operations**: Work naturally because mcp2rest maintains server state

## Contributing

Issues and pull requests welcome!

## License

MIT License - see individual package LICENSE files

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [Claude Code](https://claude.com/claude-code) - AI coding assistant with skill support
- [mcp2skill (Python)](https://github.com/ulasbilgen/mcp2skill) - Original Python implementation (being deprecated)

## Migration from Python

If you're using the Python `mcp2skill` package:

- **New package**: `mcp2scripts` (JavaScript/TypeScript)
- **Generated scripts**: JavaScript (was Python)
- **Functionality**: Same, but with JavaScript ecosystem
- **Migration guide**: See [packages/mcp2scripts/MIGRATION.md](./packages/mcp2scripts/MIGRATION.md)
