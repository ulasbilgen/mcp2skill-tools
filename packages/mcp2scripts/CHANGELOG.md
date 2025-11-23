# Changelog

All notable changes to mcp2scripts will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2025-11-23

### Fixed

- **Version synchronization** - VERSION constant now imports from package.json instead of being hardcoded
  - Created `src/version.ts` utility that imports version from package.json
  - Updated `src/index.ts` to re-export VERSION from version utility
  - Updated `src/generator.ts` to import VERSION instead of hardcoding it
  - Updated tsconfig.json to use `module: "nodenext"` for import attributes support
  - Ensures CLI `--version` and `.skill-metadata.json` always match package.json
  - Eliminates manual version updates in multiple files

## [0.3.0] - 2025-11-23

### Added

- **Server version headers in all generated scripts** - Every generated JavaScript file now includes server version information
  - Tool scripts (`scripts/*.js`) include header with: server name, version, generation date, and tool name
  - Shared MCP client (`mcp_client.js`) includes header with server name and version
  - SKILL.md frontmatter now includes `server-version` field
  - Example header format:
    ```javascript
    /**
     * MCP Server: chrome-devtools
     * Server Version: 0.10.2
     * Generated: 2025-11-23
     * Tool: navigate
     */
    ```
- **Version tracking metadata file** - New `.skill-metadata.json` file created in each skill
  - Contains: serverName, serverVersion, serverVersionInfo, generatedAt, mcp2scriptsVersion, mcp2restUrl
  - Enables skill update commands to detect server version changes
  - Used by `/m2s:update` slash command to warn about version mismatches

### Changed

- Updated `ServerInfo` type to include optional `serverVersion` field
- Generator now fetches and uses server version from mcp2rest API
- All template functions updated to accept and use version parameters

### Requirements

- Requires mcp2rest v0.5.0+ for server version information support
- Generated skills now include version metadata for better tracking and debugging

## [0.2.1] - 2025-11-23

### Fixed
- Fixed GitHub repository URL placeholders (yourusername → ulasbilgen) in README
- Updated all repository references to monorepo structure
- Documentation improvements for consistency

## [0.2.0] - 2025-11-22

### Breaking Changes

- **Changed default skill output directory from `~/.claude/skills` (user folder) to `./.claude/skills` (project folder)**
  - Skills are now generated in the current working directory by default
  - This allows project-specific skill configurations
  - Use the new `-u` or `--user` flag to generate in user folder (`~/.claude/skills`)
  - Existing workflows using the default path need to either:
    - Use `-u/--user` flag to maintain old behavior: `mcp2scripts generate chrome-devtools --user`
    - Or use `-o ~/.claude/skills` to explicitly specify user folder

### Added

- New `-u, --user` flag for `generate` command
  - Generates skills in `~/.claude/skills` (user folder)
  - Mutually exclusive with `-o, --output` flag
  - Example: `mcp2scripts generate chrome-devtools --user`

### Changed

- Default output directory changed from `~/.claude/skills` to `./.claude/skills`
- CLI help text updated to reflect new default with examples
- Documentation updated throughout (README.md, examples, API reference)
- Console "Next steps" message updated to mention both project and user skill locations

## [0.1.1] - 2025-11-22

### Added

- Automatic package.json generation for generated skills
- Skills now include package.json with required dependencies (axios, commander)
- Updated SKILL.md template with "npm install" step in Quick Start
- Added "Node.js 18+" to Prerequisites section

### Changed

- Generated skills are now complete Node.js projects ready for npm install
- No manual package.json creation required

### Testing

- Added package.json verification to integration tests
- All 98 tests passing

## [0.1.0] - 2025-11-22

### Added

- Initial release of mcp2scripts (TypeScript rewrite of Python mcp2skill)
- Generate JavaScript scripts from MCP Server Tools
- CLI with three commands: `servers`, `generate`, `tools`
- Programmatic API with `ScriptGenerator` class
- Full JSON Schema to commander.js conversion
- Automatic tool categorization in SKILL.md
- Support for all JSON Schema types (string, integer, number, boolean, array, object)
- Required field validation
- Type coercion for numeric types
- Path expansion for `~/.claude/skills`
- Custom mcp2rest endpoint support via `--endpoint` flag
- Environment variable override (`MCP_REST_URL`)
- Comprehensive test suite (98 tests)
- Full TypeScript support with exported types

### Features

- **Zero-config**: Generate skills with a single command
- **Type-safe**: Converts JSON Schema to CLI options with validation
- **Interactive**: Every tool script includes `--help` documentation
- **Stateful**: Scripts share server state through mcp2rest
- **Categorized**: Automatically organizes tools by functionality

### Documentation

- Comprehensive README with examples
- API reference
- Troubleshooting guide
- Usage examples for browser automation, filesystem operations
- TypeScript type definitions

### Testing

- 87 unit tests
- 11 integration tests
- 90%+ code coverage (lines, functions, branches, statements)

## [Unreleased]

### Planned

- Plugin system for custom tool categorization
- Support for resource templates
- Prompt templates generation
- Watch mode for automatic regeneration
- Interactive skill configuration
- Browser-based skill explorer

---

## Migration from Python mcp2skill

mcp2scripts is a complete TypeScript rewrite of the Python package `mcp2skill`:

### Breaking Changes

- Package name changed: `mcp2skill` → `mcp2scripts`
- Language: Python → TypeScript/JavaScript
- Generated scripts: Python → JavaScript
- CLI framework: Click → Commander.js
- Installation: `pip install mcp2skill` → `npm install -g mcp2scripts`
- Python requirement removed

### Improvements

- Faster execution (Node.js vs Python startup time)
- Better TypeScript integration
- Async/await throughout
- More comprehensive error messages
- Better test coverage
- Full ESM support

### Compatibility

- Same mcp2rest API compatibility
- Same skill directory structure (`~/.claude/skills/`)
- Same SKILL.md format
- Compatible with Claude Code

### Migration Steps

1. Uninstall Python package:
   ```bash
   pip uninstall mcp2skill
   ```

2. Install TypeScript package:
   ```bash
   npm install -g mcp2scripts
   ```

3. Regenerate existing skills:
   ```bash
   mcp2scripts generate --all
   ```

4. Update any automation scripts:
   - Replace `mcp2skill` with `mcp2scripts`
   - Update Python script calls to JavaScript

[0.2.0]: https://github.com/ulasbilgen/mcp2skill-tools/releases/tag/mcp2scripts-v0.2.0
[0.1.1]: https://github.com/ulasbilgen/mcp2skill-tools/releases/tag/mcp2scripts-v0.1.1
[0.1.0]: https://github.com/ulasbilgen/mcp2skill-tools/releases/tag/mcp2scripts-v0.1.0
