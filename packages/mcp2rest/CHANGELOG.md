# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2] - 2025-11-22

### Changed
- Updated repository URLs to point to monorepo at `ulasbilgen/mcp2skill-tools`
- Updated bugs and homepage URLs for monorepo structure
- Package now published from monorepo

## [0.4.1] - 2025-11-22

### Changed
- Repository migration (published without changelog update)

## [0.4.0] - 2025-11-22

### Changed
- **Temporarily downgraded `@modelcontextprotocol/sdk` from 1.21.1 to 1.18.2** for compatibility with non-compliant MCP servers (e.g., Figma Desktop sends `icon.sizes` as `string` instead of `string[]` per MCP specification)

### Note
SDK versions 1.19.0+ correctly implement the MCP specification where `icon.sizes` should be an array of strings. This downgrade is a temporary workaround until third-party servers are updated to comply with the spec. See [MCP SDK commit 7d29cee](https://github.com/modelcontextprotocol/typescript-sdk/commit/7d29cee) for details on the spec-compliant change.

## [0.3.2] - 2025-11-22

### Added
- Graceful degradation for MCP schema validation errors
- Added validation error detection and warning messages
- Allow connections to servers with schema validation issues

## [0.3.1] - 2025-11-21

### Changed
- Changed default gateway port from 3000 to 28888 to avoid conflicts with common development servers

## [0.3.0] - 2025-11-21

### Added
- `mcp2rest service stop` command to stop PM2 service
- `mcp2rest service restart` command to restart PM2 service

## [0.2.9] - 2025-11-21

### Fixed
- Service status command now uses HTTP health check for accurate status reporting
- Improved status display with server counts and connection information

## [0.2.8] - 2025-11-20

### Added
- Custom port and host configuration support
- Environment variable overrides (`MCP2REST_PORT`, `MCP2REST_HOST`)
- Command-line options for port (`-p, --port`) and host (`-H, --host`)

## [0.2.7] - 2025-11-20

### Added
- OpenAPI specification endpoint at `/openapi.yaml`
- Complete API documentation in OpenAPI 3.0 format

## [0.2.6] - 2025-11-19

### Added
- HTTP transport support for MCP servers
- `StreamableHTTPClientTransport` for SSE-based MCP connections
- Auto-detection of transport type (http/stdio) based on package/URL format
- `-t, --transport` option in `add` command for explicit transport specification

## [0.2.5] - 2025-11-19

### Fixed
- Hot-remove functionality: prevent server auto-reconnection after removal
- Servers now properly disconnect when removed via DELETE endpoint

## [0.2.4] - 2025-11-19

### Fixed
- PM2 service configuration: separated server entry point from CLI
- Direct server start without Commander overhead
- Improved PM2 service reliability

## [0.2.3] - 2025-11-18

### Fixed
- Version now read from package.json instead of being hardcoded
- Dynamic version display in CLI help

## [0.2.2] - 2025-11-18

### Fixed
- Added `.npmrc` to `.gitignore` for security
- Added `*.tgz` to `.gitignore` to exclude npm package files

## [0.2.1] - 2025-11-18

### Changed
- Updated PRD and README to reflect PM2 implementation details

## [0.2.0] - 2025-11-18

### Added
- PM2 service management functionality
- `mcp2rest service install` command
- `mcp2rest service uninstall` command
- `mcp2rest service status` command with detailed metrics
- `mcp2rest service logs` command with follow mode
- Auto-restart capability
- Centralized logging in `~/.mcp2rest/logs/`

### Changed
- Improved daemon management with PM2 integration
- Enhanced service monitoring and control

## [0.1.0] - 2025-11-17

### Added
- Initial release of mcp2rest
- MCP Gateway daemon for managing multiple MCP servers
- REST API for tool execution
- Support for stdio-based MCP servers
- Configuration management via YAML
- Server add/remove functionality
- Health check endpoint
- CLI with start/stop commands
- Auto-reconnection for failed servers
- Configurable timeout for tool execution

[0.4.0]: https://github.com/ulasbilgen/mcp2rest/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/ulasbilgen/mcp2rest/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/ulasbilgen/mcp2rest/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.9...v0.3.0
[0.2.9]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/ulasbilgen/mcp2rest/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/ulasbilgen/mcp2rest/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ulasbilgen/mcp2rest/releases/tag/v0.1.0
