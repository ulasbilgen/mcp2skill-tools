# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
