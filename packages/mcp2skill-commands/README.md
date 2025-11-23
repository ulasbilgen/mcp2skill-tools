# mcp2skill-commands

**Interactive Claude Code slash commands for generating skills from MCP servers.**

This project provides 5 slash commands that guide you through the complete workflow of setting up mcp2rest, adding MCP servers, and generating high-quality Claude Code skills with LLM-assisted documentation.

---

## What are these commands?

These are Claude Code slash commands that provide an **interactive, LLM-enhanced** workflow for creating skills from MCP servers:

- `/m2s:init` - First-time setup wizard (installs mcp2rest + mcp2scripts)
- `/m2s:add` - Add new MCP server to mcp2rest
- `/m2s:list` - List servers and skill generation status
- `/m2s:generate` - **Interactive skill generation with Claude**
- `/m2s:update` - Update existing skill with latest tools/docs

The commands use Claude to analyze your MCP servers, suggest intelligent tool groupings, and generate enhanced documentation following best practices.

---

## Prerequisites

You need these two packages installed:

### 1. mcp2rest (Node.js service)

```bash
npm install -g mcp2rest
```

[mcp2rest](https://github.com/ulasbilgen/mcp2skill-tools/tree/main/packages/mcp2rest) is a REST API gateway for MCP servers.

### 2. mcp2scripts (JavaScript/TypeScript package)

```bash
npm install -g mcp2scripts
```

[mcp2scripts](https://github.com/ulasbilgen/mcp2skill-tools/tree/main/packages/mcp2scripts) generates Claude Code skills (JavaScript scripts) from mcp2rest servers.

---

## Installation

### Option 1: Manual Installation

1. **Copy the commands directory:**
   ```bash
   cp -r .claude/commands/m2s ~/.claude/commands/
   ```

2. **Copy the skill authoring guide:**
   ```bash
   cp docs/skill-authoring-guide.md ~/.claude/
   ```

### Option 2: Clone and Symlink

```bash
# Clone this repo
git clone https://github.com/ulasbilgen/mcp2skill-tools.git
cd mcp2skill-tools/packages/mcp2skill-commands

# Create symlink for commands
ln -s $(pwd)/.claude/commands/m2s ~/.claude/commands/m2s

# Copy skill authoring guide
cp docs/skill-authoring-guide.md ~/.claude/
```

### Verification

In Claude Code, type `/m2s` and you should see all 5 commands auto-complete.

---

## Usage Workflow

### Step 1: First-Time Setup

```
/m2s:init
```

Claude will:
- Check if mcp2rest and mcp2scripts are installed
- Guide you through installation if needed
- Start the mcp2rest service
- Verify it's running on http://localhost:28888

### Step 2: Add MCP Servers

```
/m2s:add chrome-devtools chrome-devtools-mcp@latest
```

Claude will:
- Detect the server type (stdio/npm or HTTP)
- Add it to mcp2rest
- Verify connection and tool count

### Step 3: List Servers

```
/m2s:list
```

Claude will:
- Show all connected servers
- Check which ones have skills already generated
- Recommend what to generate next

### Step 4: Generate Skills (Interactive!)

```
/m2s:generate chrome-devtools
```

Claude will:
1. **Analyze the server** - Read tool descriptions and detect domain
2. **Ask where to generate** - Project-level (`./.claude/skills/` - default) or user-level (`~/.claude/skills/`)
3. **Suggest tool groupings** - For servers with >10 tools
4. **Generate JavaScript scripts** - Creates Node.js scripts with commander.js CLI
5. **Install dependencies** - Runs `npm install` for axios and commander
6. **Generate enhanced SKILL.md** - Following best practices from the skill authoring guide
7. **Create reference files** - Progressive disclosure for complex skills
8. **Iterate with feedback** - Refine before finalizing

### Step 5: Update Skills

```
/m2s:update chrome-devtools
```

Claude will:
- Compare current skill vs server tools
- Detect added/removed tools
- Offer update options (scripts only, docs only, or full regen)
- Create backups before updating

---

## Command Reference

### `/m2s:init`

**First-time setup wizard**

Checks installation status, installs prerequisites if needed, starts mcp2rest service, and lists existing servers.

**No arguments required.**

---

### `/m2s:add <server-name> [package-or-url]`

**Add new MCP server to mcp2rest**

**Arguments:**
- `<server-name>` - Name for the server (e.g., "chrome-devtools")
- `[package-or-url]` - Optional npm package or HTTP URL
  - For stdio/npm servers: `chrome-devtools-mcp@latest`
  - For HTTP servers: `--url http://127.0.0.1:3845/mcp`

**Examples:**
```
/m2s:add chrome-devtools chrome-devtools-mcp@latest
/m2s:add figma-desktop --url http://127.0.0.1:3845/mcp
```

---

### `/m2s:list`

**List all MCP servers and skill generation status**

Shows which servers are connected, how many tools each has, and which ones need skills generated.

**No arguments required.**

---

### `/m2s:generate <server-name>`

**Interactively generate Claude Code skill from MCP server**

**Arguments:**
- `<server-name>` - Name of the server to generate skill for

**What happens:**
- Claude analyzes your server's tools
- For simple skills (≤10 tools): Creates basic SKILL.md
- For complex skills (>10 tools):
  - Suggests logical tool groupings
  - Creates progressive disclosure structure
  - Generates workflow examples
  - Creates reference documentation

**Example:**
```
/m2s:generate chrome-devtools
```

**References:** Follows best practices from `@docs/skill-authoring-guide.md`

---

### `/m2s:update <server-name>`

**Update existing skill with new tools or improved documentation**

**Arguments:**
- `<server-name>` - Name of the skill to update

**What happens:**
- Detects added/removed tools since last generation
- Offers update options:
  1. Scripts only - Just regenerate JavaScript tool scripts and reinstall dependencies
  2. Docs only - Improve SKILL.md with latest best practices
  3. Full regeneration - Complete rebuild
- Creates backup before updating

**Example:**
```
/m2s:update chrome-devtools
```

---

## Skill Authoring Guide

The commands reference `docs/skill-authoring-guide.md`, which contains all best practices for writing high-quality Claude Code skills:

- Quality standards
- Progressive disclosure patterns
- SKILL.md structure
- Workflow examples
- Common anti-patterns to avoid

This guide is automatically consulted during `/m2s:generate` and `/m2s:update` to ensure generated skills follow best practices.

---

## Generated Skill Structure

### Simple Skills (≤10 tools)

```
~/.claude/skills/mcp-{server-name}/
├── SKILL.md              # Main documentation (~150-300 lines)
└── scripts/
    ├── mcp_client.js     # Shared REST client
    ├── tool1.js          # Tool scripts with commander.js
    ├── tool2.js
    └── ...
```

### Complex Skills (>10 tools)

```
~/.claude/skills/mcp-{server-name}/
├── SKILL.md              # Overview + quick start (~300-500 lines)
├── scripts/              # All tool scripts
│   ├── mcp_client.js
│   └── ...
├── workflows/            # Common workflow examples
│   ├── automation.md
│   └── testing.md
└── reference/            # Progressive disclosure
    ├── all-tools.md
    └── troubleshooting.md
```

---

## How It Works

```
┌─────────────────────────────────────────┐
│ 1. User runs /m2s:generate              │
│    Claude Code slash command            │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 2. Claude analyzes MCP server           │
│    Queries: mcp2scripts tools <server>    │
│    Detects domain, complexity           │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 3. Asks user for choices                │
│    - Where to generate skill?           │
│    - Tool grouping preferences?         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 4. Generates JavaScript scripts             │
│    Runs: mcp2scripts generate <server>    │
│    Creates JavaScript scripts with commander.js CLI            │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 5. Claude writes enhanced docs          │
│    Following skill-authoring-guide.md   │
│    Creates SKILL.md, workflows, refs    │
└─────────────────────────────────────────┘
```

---

## Example: Complete Workflow

```
You: /m2s:init

Claude: Let me help you set up mcp2scripts...
        Checking mcp2rest... not installed
        → Installing: npm install -g mcp2rest
        ✓ Installed
        ...

You: /m2s:add chrome-devtools chrome-devtools-mcp@latest

Claude: Adding chrome-devtools...
        [Runs: mcp2rest add chrome-devtools chrome-devtools-mcp@latest]
        ✓ Connected with 26 tools

        Ready to generate skill? Use: /m2s:generate chrome-devtools

You: /m2s:generate chrome-devtools

Claude: I found 26 tools in chrome-devtools. Let me analyze them...

        I suggest organizing into 4 groups:
        1. Page Management (6 tools) - new_page, navigate, close_page...
        2. Element Interaction (8 tools) - click, fill, hover...
        3. Inspection & Debug (7 tools) - take_snapshot, screenshot...
        4. Advanced (5 tools) - evaluate_script, inject_script...

        Does this structure work for you?

You: Yes

Claude: Where should this skill be generated?
        [Shows options: User skills vs Project skills]

You: User skills

Claude: Generating skill with:
        - SKILL.md (overview + quick start)
        - workflows/automation.md (form workflows)
        - workflows/testing.md (inspection workflows)
        - reference/all-tools.md (complete listing)

        ✓ Generated skill at ~/.claude/skills/mcp-chrome-devtools/
```

---

## Troubleshooting

### "Command not found"

Make sure you copied the commands:
```bash
ls ~/.claude/commands/m2s/
```

Should show: `add.md`, `generate.md`, `init.md`, `list.md`, `update.md`

### "skill-authoring-guide.md not found"

The `/m2s:generate` and `/m2s:update` commands reference `@docs/skill-authoring-guide.md`. Make sure it exists:
```bash
ls ~/. claude/docs/skill-authoring-guide.md
```

Or update the `@` references in the command files.

### "Cannot connect to mcp2rest"

Make sure mcp2rest is running:
```bash
curl http://localhost:28888/health
```

If not running:
```bash
mcp2rest start
```

---

## Related Projects

- **[mcp2rest](https://github.com/ulasbilgen/mcp2skill-tools/tree/main/packages/mcp2rest)** - REST API gateway for MCP servers (required)
- **[mcp2scripts](https://github.com/ulasbilgen/mcp2skill-tools/tree/main/packages/mcp2scripts)** - Skill generator from mcp2rest (required)
- **[MCP](https://modelcontextprotocol.io)** - Model Context Protocol specification

---

## License

MIT License - see LICENSE file

## Author

Ulas Bilgenoglu

---

## Contributing

Issues and pull requests welcome!

- GitHub: https://github.com/ulasbilgen/mcp2skill-tools/tree/main/packages/mcp2skill-commands
- Issues: https://github.com/ulasbilgen/mcp2skill-tools/issues
