# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-11-23

### Fixed

- **Fixed skill-authoring-guide.md path references in slash commands**
  - Updated all references from relative paths (`./docs/skill-authoring-guide.md`) to Claude Code-resolvable paths (`./.claude/commands/m2s/docs/skill-authoring-guide.md`)
  - Ensures the guide can be found regardless of which directory Claude Code is running from
  - Affects `/m2s:generate` (4 references) and `/m2s:update` (2 references)
- **Fixed mcp2rest default port in CLAUDE.md**
  - Updated documentation to reflect correct default port 28888 instead of 3000

## [0.2.0] - 2025-11-23

### Breaking Changes

- **Updated for mcp2scripts (JavaScript) instead of mcp2skill (Python)**
  - All commands now generate JavaScript scripts instead of Python scripts
  - Skills use `mcp_client.js` instead of `mcp_client.py`
  - Tool scripts use commander.js instead of argparse
  - Skills include `package.json` with dependencies (axios, commander)
  - npm install required after skill generation

- **Default skill location changed to project folder**
  - Skills now generated in `./.claude/skills/` (project) by default
  - Use `--user` flag to generate in `~/.claude/skills/` (user) folder
  - This aligns with mcp2scripts v0.2.0 default behavior

### Changed

- Updated `/m2s:init` to check for and install mcp2scripts instead of mcp2skill
- Updated `/m2s:generate` to:
  - Generate JavaScript scripts with commander.js
  - Run `npm install` in scripts directory after generation
  - Default to project folder with option for user folder
  - Show package.json in skill structure
- Updated `/m2s:update` to:
  - Regenerate JavaScript scripts
  - Run `npm install` after script regeneration
  - Check both project and user folders for existing skills
- Updated `/m2s:list` to check both `./.claude/skills/` and `~/.claude/skills/`
- Updated all documentation (README.md, skill-authoring-guide.md) for JavaScript
- Updated all examples to show `node scripts/tool.js` instead of `python scripts/tool.py`

### Dependencies

- Now requires [mcp2rest](https://github.com/ulasbilgen/mcp2skill-tools/tree/main/packages/mcp2rest) v0.4.0+
- Now requires [mcp2scripts](https://github.com/ulasbilgen/mcp2skill-tools/tree/main/packages/mcp2scripts) v0.2.0+
- Node.js 18+ required (for generated skills)

### Migration Guide

If upgrading from v0.1.0:

1. Uninstall Python package: `pip uninstall mcp2skill`
2. Install JavaScript package: `npm install -g mcp2scripts`
3. Regenerate existing skills: `/m2s:generate <server-name>`
4. Update any custom scripts to use JavaScript syntax
5. Run `npm install` in each skill's scripts directory

## [0.1.0] - 2025-01-22

### Added

- Initial release of mcp2skill-commands
- `/m2s:init` - First-time setup wizard for mcp2rest and mcp2skill
- `/m2s:add` - Add new MCP server to mcp2rest
- `/m2s:list` - List all MCP servers and skill generation status
- `/m2s:generate` - Interactive skill generation with LLM-assisted documentation
- `/m2s:update` - Update existing skills with new tools or improved docs
- Skill authoring best practices guide (`docs/skill-authoring-guide.md`)
- Complete documentation and examples
- MIT License

### Features

- **Interactive skill generation** - Claude analyzes your MCP servers and suggests intelligent tool groupings
- **Progressive disclosure** - Automatic creation of workflow examples and reference docs for complex skills (>10 tools)
- **Best practices enforcement** - All generated skills follow the skill authoring guide
- **Smart updates** - Detects added/removed tools and offers targeted update options
- **Flexible installation** - User-level (`~/.claude/skills/`) or project-level (`./.claude/skills/`) skill generation

### Dependencies

- Requires [mcp2rest](https://github.com/ulasbilgen/mcp2rest) v0.6.0+
- Requires [mcp2skill](https://github.com/ulasbilgen/mcp2skill) v0.1.10+
