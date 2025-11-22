# mcp2rest - Product Requirements Document

**Version:** 1.0  
**Date:** October 23, 2025  
**Status:** Approved for Development

---

## Executive Summary

**mcp2rest** is a standalone Node.js daemon that manages multiple MCP servers and exposes their tools via REST API. It solves the problem of MCP servers being Node.js-only by providing a universal HTTP interface accessible from any programming language. The gateway runs as a production-ready service using PM2 for process management, auto-restart, and centralized logging.

**Target Users:** Developers using Python, Go, Rust, or any language that can make HTTP requests who want to leverage MCP tools (browser automation, file systems, etc.) without Node.js integration complexity.

**Key Features:** REST API for all operations, PM2 service management, dynamic server configuration, and production-grade reliability.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Client Applications              │
│  (Python, JavaScript, any HTTP client)   │
└──────────────────┬──────────────────────┘
                   │ HTTP/REST
          ┌────────▼────────┐
          │  mcp2rest    │
          │  (Node.js)      │
          │  Port: 28888     │
          └────────┬────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
   ┌───▼───┐   ┌──▼───┐   ┌───▼───┐
   │ MCP   │   │ MCP  │   │ MCP   │
   │Server │   │Server│   │Server │
   │   1   │   │  2   │   │  3    │
   └───────┘   └──────┘   └───────┘
```

---

## MVP Scope

### ✅ In Scope

1. **REST API (Primary Interface)**
   - `POST /call` - Execute tool on any server
   - `GET /servers` - List all servers with status
   - `GET /servers/:name/tools` - List tools for specific server
   - `POST /servers` - Add server dynamically
   - `GET /health` - Health check endpoint

2. **PM2 Service Management**
   - `service install` - Install as system service
   - `service uninstall` - Remove service
   - `service status` - Check service status
   - `service logs` - View logs with follow mode
   - Auto-restart on failure
   - Centralized log management at `~/.mcp2rest/logs/`

3. **Gateway Daemon**
   - Foreground mode: `start`, `stop` commands
   - Service mode: PM2-managed process
   - Persistent connections to all MCP servers
   - PID file at `~/.mcp2rest/gateway.pid` (foreground mode)
   - npx-based MCP server installation

4. **Configuration**
   - YAML config at `~/.mcp2rest/config.yaml`
   - Auto-created with defaults on first start
   - Edit config + service restart for updates
   - Example configurations included

5. **Production Readiness**
   - Console logging with timestamps
   - Error handling with standardized codes
   - Graceful shutdown (SIGTERM/SIGINT)
   - npm package with global installation
   - PM2 ecosystem configuration

### ❌ Out of Scope (Post-MVP)

- Auto-reconnect with exponential backoff (high-priority TODO)
- `DELETE /servers/:name` REST endpoint (backend method exists)
- Extensive CLI commands (`list`, `tools`, `remove`, `config`, `init`, `status`)
  - Rationale: REST API + PM2 provide these capabilities
- Authentication/Authorization
- Rate limiting
- WebSocket support for streaming
- Multi-instance clustering
- Web-based GUI/Dashboard
- Tool result caching
- Per-user configurations

---

## Technical Architecture

### 1. Configuration Management

**Location:** `~/.mcp2rest/config.yaml`

```yaml
servers:
  chrome:
    package: chrome-devtools-mcp@latest
    args: ["--headless=true", "--isolated=true"]
  
  filesystem:
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/home/user/workspace"]

gateway:
  port: 28888
  host: localhost
  timeout: 30000  # Global tool execution timeout (ms)
  logLevel: info  # debug | info | warn | error
```

**Configuration Update Strategy:**
- Edit `~/.mcp2rest/config.yaml` manually
- Restart service: `pm2 restart mcp2rest` (or `mcp2rest stop && mcp2rest start` for foreground)
- Gateway reconnects to all configured servers
- Brief downtime during restart (~1-2 seconds)

### 2. Server Connection Model

```typescript
interface ServerConfig {
  name: string;
  package: string;
  args?: string[];
}

interface ServerState {
  config: ServerConfig;
  status: 'connected' | 'disconnected' | 'error';
  client: Client | null;
  tools: Tool[];
  reconnectAttempts: number;
  lastError?: string;
}

class Gateway {
  private servers: Map<string, ServerState>;
  private config: Config;
  
  // Core operations
  async addServer(name: string, pkg: string, args?: string[]): Promise<void>;
  async removeServer(name: string): Promise<void>;
  async callTool(server: string, tool: string, arguments: any): Promise<any>;
  
  // Connection management
  async connectServer(name: string): Promise<void>;
  async disconnectServer(name: string): Promise<void>;
  async reconnectServer(name: string): Promise<void>;
  
  // Discovery
  listServers(): ServerInfo[];
  listTools(serverName: string): Tool[];
}
```

**Connection Lifecycle:**
1. Server added → npx installs package → spawn process → establish MCP connection
2. Connection established → mark as 'connected' status
3. Connection lost → mark as 'error' status with error message
4. **TODO:** Auto-reconnect with exponential backoff (not yet implemented)
5. Recovery: Restart gateway to reconnect all servers

### 3. Process Management

**Two Operation Modes:**

**Foreground Mode** (Development):
```bash
# Start gateway in foreground
mcp2rest start

# Stop gateway (sends SIGTERM to PID)
mcp2rest stop
```
- PID file at `~/.mcp2rest/gateway.pid`
- Graceful shutdown on SIGTERM/SIGINT
- Console output to stdout/stderr

**Service Mode** (Production - PM2):
```bash
# Install as system service
mcp2rest service install

# Check service status
mcp2rest service status

# View logs
mcp2rest service logs --follow

# Uninstall service
mcp2rest service uninstall
```
- Managed by PM2 process manager
- Auto-restart on failure (500M memory limit)
- Centralized logs at `~/.mcp2rest/logs/`
- Survives system reboots (with PM2 startup)
- Configuration: `ecosystem.config.js`

### 4. REST API Design

**Base URL:** `http://localhost:28888`

#### `GET /health`
Health check with server count.

**Response:**
```json
{
  "status": "ok",
  "serverCount": 2,
  "connectedServers": 1
}
```

#### `GET /servers`
List all servers with status.

**Response:** (Array of servers, not wrapped in object)
```json
[
  {
    "name": "chrome",
    "package": "chrome-devtools-mcp@latest",
    "status": "connected",
    "toolCount": 26,
    "lastConnected": "2025-01-08T10:30:00.000Z"
  },
  {
    "name": "filesystem",
    "package": "@modelcontextprotocol/server-filesystem",
    "status": "error",
    "toolCount": 0,
    "error": "Connection refused"
  }
]
```

#### `POST /servers`
Add a new server dynamically.

**Request:**
```json
{
  "name": "chrome",
  "package": "chrome-devtools-mcp@latest",
  "args": ["--headless=true"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Server 'chrome' added successfully"
}
```

#### `DELETE /servers/:name`
**⚠️ NOT YET IMPLEMENTED** (Backend method `Gateway.removeServer()` exists)

Remove a server.

**Planned Response:**
```json
{
  "success": true,
  "message": "Server 'chrome' removed"
}
```

#### `GET /servers/:name/tools`
List all tools for a specific server.

**Response:**
```json
{
  "server": "chrome",
  "tools": [
    {
      "name": "navigate",
      "description": "Navigate to a URL",
      "inputSchema": {
        "type": "object",
        "properties": {
          "url": { "type": "string" }
        },
        "required": ["url"]
      }
    }
  ]
}
```

#### `POST /call`
Execute a tool on a server.

**Request:**
```json
{
  "server": "chrome",
  "tool": "navigate",
  "arguments": {
    "url": "https://example.com"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Navigated to https://example.com"
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "SERVER_DISCONNECTED",
    "message": "Chrome server is not connected",
    "serverName": "chrome"
  }
}
```

### 5. Error Handling

**Standardized Error Codes:**

```typescript
enum ErrorCode {
  // Server errors
  SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',           // Server name doesn't exist
  SERVER_DISCONNECTED = 'SERVER_DISCONNECTED',     // Server not connected
  SERVER_ADD_FAILED = 'SERVER_ADD_FAILED',         // Failed to add server
  
  // Tool errors
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',               // Tool doesn't exist on server
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',   // Tool ran but failed
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',                   // Execution exceeded timeout
  
  // Validation errors
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',         // Arguments don't match schema
  INVALID_CONFIG = 'INVALID_CONFIG',               // Config file malformed
  
  // System errors
  GATEWAY_ERROR = 'GATEWAY_ERROR'                  // Internal gateway error
}
```

**Error Response Format:**
```json
{
  "error": {
    "code": "TOOL_TIMEOUT",
    "message": "Tool execution exceeded 30s timeout",
    "serverName": "chrome",
    "toolName": "screenshot",
    "details": {}
  }
}
```

### 6. Logging Strategy

**Development (Laptop):**
- Human-readable console output
- Colored logs with timestamps
- Log level: `info` by default

**Log Levels:**
- `debug`: Detailed MCP protocol messages
- `info`: Server connections, tool calls, CLI operations
- `warn`: Reconnection attempts, deprecated usage
- `error`: Failures, exceptions

**Example Log Output:**
```
[2025-10-23 14:32:01] INFO  Server 'chrome' connected (26 tools available)
[2025-10-23 14:32:15] INFO  Tool call: chrome.navigate(url=https://example.com)
[2025-10-23 14:32:16] INFO  Tool call completed in 1.2s
[2025-10-23 14:33:01] WARN  Server 'chrome' disconnected, attempting reconnect...
[2025-10-23 14:33:02] INFO  Server 'chrome' reconnected successfully
```

---

## CLI Commands Reference

**Philosophy:** The gateway is API-first. Use REST endpoints for server operations. CLI provides daemon/service management and one convenience command.

### Gateway Control (Foreground Mode)

#### `mcp2rest start`
Start the gateway in foreground mode (development).

```bash
mcp2rest start [-c <config-path>]
```

**Behavior:**
- Runs in foreground (attached to terminal)
- Writes PID to `~/.mcp2rest/gateway.pid`
- Auto-creates config if missing
- Connects to all servers in config
- Exits if PM2 service already running

#### `mcp2rest stop`
Stop the foreground gateway or PM2 service.

```bash
mcp2rest stop
```

**Behavior:**
- Detects if running as PM2 service or foreground
- Sends SIGTERM to foreground process (reads PID)
- Stops PM2 service if detected
- Removes PID file

### PM2 Service Management

#### `mcp2rest service install`
Install gateway as a system service with PM2.

```bash
mcp2rest service install
```

**Behavior:**
- Starts gateway via PM2 using `ecosystem.config.js`
- Configures auto-restart on failure
- Sets up centralized logs at `~/.mcp2rest/logs/`
- Optionally configures boot startup

#### `mcp2rest service uninstall`
Remove the PM2 service.

```bash
mcp2rest service uninstall
```

#### `mcp2rest service status`
Check service status and resource usage.

```bash
mcp2rest service status
```

**Output:**
```
MCP Gateway Service Status:
═══════════════════════════════════════
Status:   🟢 online
Uptime:   2h 15m
Memory:   245 MB
CPU:      2%
Restarts: 0
═══════════════════════════════════════
```

#### `mcp2rest service logs`
View service logs.

```bash
# View last 100 lines
mcp2rest service logs

# Follow logs in real-time
mcp2rest service logs --follow

# Show last 50 lines
mcp2rest service logs --lines 50
```

### Server Management (Convenience)

#### `mcp2rest add <name> <package> [--args ...]`
Add a new MCP server via HTTP API (requires gateway running).

```bash
# Basic
mcp2rest add chrome chrome-devtools-mcp@latest

# With arguments
mcp2rest add fs @modelcontextprotocol/server-filesystem --args /home/user/workspace
```

**Behavior:**
- Sends `POST /servers` to running gateway
- Gateway installs package via npx
- Updates config.yaml
- Connects to server

**Alternative:** Edit `~/.mcp2rest/config.yaml` + restart service

### NOT IMPLEMENTED (Use REST API Instead)

The following commands are NOT implemented. Use REST API endpoints or direct config editing:

- ❌ `mcp2rest remove` → Use `DELETE /servers/:name` (TODO) or edit YAML
- ❌ `mcp2rest list` → Use `GET /servers` endpoint
- ❌ `mcp2rest tools` → Use `GET /servers/:name/tools` endpoint
- ❌ `mcp2rest config` → Use `cat ~/.mcp2rest/config.yaml`
- ❌ `mcp2rest init` → Config auto-created on first start
- ❌ `mcp2rest status` → Use `mcp2rest service status` for PM2

**Rationale:** With PM2 + REST API, extensive CLI commands are redundant.

---

## Project Structure

```
mcp2rest/
├── package.json
├── tsconfig.json
├── ecosystem.config.js        # PM2 configuration
├── README.md
├── .gitignore
├── src/
│   ├── bin/
│   │   └── mcp2rest.ts        # CLI entry point (Commander.js)
│   ├── gateway/
│   │   └── Gateway.ts         # Core Gateway class
│   ├── api/
│   │   └── APIServer.ts       # Express REST API server
│   ├── config/
│   │   └── ConfigManager.ts   # YAML config management
│   └── types/
│       └── index.ts           # TypeScript interfaces
├── config.example.yaml        # Example configuration
└── dist/                      # Compiled TypeScript output (npm published)
    ├── bin/
    │   └── mcp2rest.js        # Compiled CLI (with shebang)
    ├── gateway/
    ├── api/
    ├── config/
    └── types/
```

---

## Dependencies

### Production Dependencies
```json
{
  "express": "^4.18.2",
  "commander": "^11.1.0",
  "js-yaml": "^4.1.0",
  "@modelcontextprotocol/sdk": "^0.5.0",
  "pm2": "^5.3.0"
}
```

**Note:** Winston is NOT used. Logging uses console output with timestamps.

### Development Dependencies
```json
{
  "typescript": "^5.3.3",
  "@types/node": "^20.10.0",
  "@types/express": "^4.17.21",
  "@types/js-yaml": "^4.0.9",
  "ts-node": "^10.9.2"
}
```

---

## Implementation Phases

### Phase 1: Core Gateway (Days 1-3)
**Goal:** Basic gateway with manual config

- [x] Project setup (TypeScript, npm package structure)
- [x] Config loading from YAML
- [x] Gateway class: connect to servers from config
- [x] Tool execution logic with timeout (30s global)
- [x] Basic error handling

**Milestone:** Can call tools via code, no CLI/API yet.

### Phase 2: REST API (Days 4-5)
**Goal:** HTTP interface working

- [x] Express server setup
- [x] Implement all 6 endpoints
- [x] Error response standardization
- [x] Request validation
- [x] Health check endpoint

**Milestone:** Can add servers and call tools via curl.

### Phase 3: CLI & PM2 (Days 6-8)
**Goal:** Service management and basic CLI

- [x] Commander.js integration
- [x] Daemon process management (start/stop)
- [x] PM2 service commands (install/uninstall/status/logs)
- [x] Dynamic add command (convenience)
- [ ] ~~Remove/list/tools commands~~ (not needed with API)
- [ ] ~~Hot-reload mechanism~~ (PM2 restart instead)

**Milestone:** PM2 service management works, basic CLI complete.

### Phase 4: Polish & Ship (Days 9-10)
**Goal:** Production-ready npm package

- [x] Console logging with timestamps
- [ ] **Auto-reconnect with exponential backoff** (HIGH PRIORITY TODO)
- [x] README with examples
- [x] npm packaging and global install testing
- [x] PM2 production deployment
- [x] Edge case handling

**Milestone:** Ready for production use (except auto-reconnect).

---

## Technical Decisions (Finalized)

### ✅ PM2 Service Management
**Decision:** Use PM2 for production deployment instead of custom daemon management.

**Rationale:**
- Battle-tested process manager with auto-restart
- Built-in log management and rotation
- Resource monitoring (CPU, memory)
- Boot startup configuration
- Reduces custom daemon code complexity

**Implementation:**
- `mcp2rest service install` uses PM2 via `ecosystem.config.js`
- Auto-restart on failure with 500M memory limit
- Centralized logs at `~/.mcp2rest/logs/`
- Coexists with foreground mode for development

### ✅ Configuration Update Strategy
**Decision:** Edit config.yaml + service restart (no hot-reload).

**Rationale:**
- Simpler implementation (no IPC/signals)
- PM2 restart is fast (~1-2 seconds)
- Config file remains single source of truth
- No risk of config/runtime state divergence

**Implementation:**
- Users edit `~/.mcp2rest/config.yaml` manually
- Run `pm2 restart mcp2rest` or `mcp2rest stop && mcp2rest start`
- Gateway reconnects to all servers on startup
- `mcp2rest add` command is convenience wrapper around `POST /servers` API

### ✅ Tool Execution Timeout
**Decision:** 30s global timeout (configurable in config.yaml).

**Rationale:**
- Simple for MVP (one setting to tune)
- Prevents hung requests on dev laptop
- Per-tool timeout can be added post-MVP if needed

**Implementation:**
```typescript
const timeout = this.config.gateway.timeout || 30000;
const result = await Promise.race([
  this.callToolInternal(server, tool, args),
  this.timeoutPromise(timeout)
]);
```

### ✅ Server Package Installation
**Decision:** Use `npx` for dynamic package resolution.

**Rationale:**
- Leverages npm's package ecosystem
- No need to bundle MCP servers
- Users can use any version/fork

**Trade-off:** First `add` command is slow (downloads package). Acceptable for MVP.

### ✅ Configuration Persistence
**Decision:** YAML file at `~/.mcp2rest/config.yaml` is source of truth.

**Rationale:**
- Human-readable and editable
- Git-friendly for version control
- Easy to backup/share across machines

**Trade-off:** Must handle concurrent writes (use file locking or queue writes).

### ✅ Logging Strategy
**Decision:** Console output with timestamps (no Winston).

**Rationale:**
- Simple and sufficient for MVP
- PM2 captures and manages all console output
- PM2 provides log rotation and viewing (`mcp2rest service logs`)
- Avoids dependency overhead
- Production-ready via PM2 log management

**Implementation:**
- Use `console.log/error()` with prefixes
- PM2 adds timestamps automatically
- Logs stored at `~/.mcp2rest/logs/` (out.log, error.log, combined.log)

---

## Risk Management

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| npx package install slow (10-30s) | Medium | High | Show progress spinner, cache packages locally |
| Multiple simultaneous `add` commands | High | Low | Queue operations, process serially |
| Config file corruption | High | Low | Validate YAML on load, backup before write |
| MCP server crashes frequently | High | Medium | Auto-reconnect with backoff, clear status reporting |
| Gateway process crashes | Medium | Low | Acceptable for MVP (PID cleanup on next start) |
| Tool execution blocks event loop | Medium | Low | Use async/await properly, hard timeout prevents hangs |
| Breaking changes in MCP SDK | Medium | Low | Pin SDK version in package.json |

---

## Success Metrics

### MVP Launch Criteria
- ✅ Install via `npm install -g mcp2rest` works
- ✅ Can add/remove servers without gateway restart
- ✅ Tool execution completes with <100ms gateway overhead
- ✅ Gateway survives MCP server crashes (auto-reconnect works)
- ✅ All CLI commands have help text
- ✅ README includes quickstart guide

### Post-Launch (Month 1)
- 100+ npm downloads
- 5+ GitHub stars
- 0 critical bugs reported
- Documentation for 3+ common MCP servers

---

## Future Enhancements (Post-MVP)

### Authentication & Security
- API key authentication
- Per-server access control
- TLS support

### Scalability
- WebSocket support for streaming results
- Per-tool timeout overrides
- Connection pooling for high concurrency

### Developer Experience
- Client libraries (Python, Go, Rust)
- OpenAPI spec generation
- Interactive web dashboard

### Observability
- Metrics export (Prometheus)
- Distributed tracing
- Tool execution analytics

---

## Appendix: Usage Examples

### Example 1: Browser Automation
```bash
# Setup
mcp2rest init
mcp2rest start
mcp2rest add chrome chrome-devtools-mcp@latest

# Use from Python
curl -X POST http://localhost:28888/call \
  -H "Content-Type: application/json" \
  -d '{
    "server": "chrome",
    "tool": "navigate",
    "arguments": {"url": "https://example.com"}
  }'

curl -X POST http://localhost:28888/call \
  -H "Content-Type: application/json" \
  -d '{
    "server": "chrome",
    "tool": "screenshot",
    "arguments": {}
  }'
```

### Example 2: File System Operations
```bash
# Add filesystem server
mcp2rest add fs @modelcontextprotocol/server-filesystem --args /home/user/workspace

# List files
curl http://localhost:28888/call \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "server": "fs",
    "tool": "list_directory",
    "arguments": {"path": "/"}
  }'
```

### Example 3: Multi-Server Setup
```bash
# Install service
mcp2rest service install

# Add multiple servers
mcp2rest add chrome chrome-devtools-mcp@latest
mcp2rest add github @modelcontextprotocol/server-github
mcp2rest add fs @modelcontextprotocol/server-filesystem --args ~/projects

# List all servers via API
curl http://localhost:28888/servers

# Check tools for each via API
curl http://localhost:28888/servers/chrome/tools
curl http://localhost:28888/servers/github/tools
curl http://localhost:28888/servers/fs/tools
```

---

## Questions & Answers

**Q: Why not use WebSockets instead of REST?**  
A: REST is simpler for MVP and works with any HTTP client. WebSockets can be added post-MVP for streaming.

**Q: Can I run multiple gateway instances?**  
A: Not in MVP (single PID file). Clustering can be added later if needed.

**Q: How do I secure the gateway?**  
A: For dev laptop, no auth needed. Production users should put gateway behind reverse proxy (nginx) with auth.

**Q: What if two clients call the same tool simultaneously?**  
A: MCP protocol supports concurrent calls. Gateway doesn't queue. If issues arise, we'll add per-server queuing.

**Q: Can I edit config.yaml manually?**
A: Yes! This is the recommended way for production. Edit `~/.mcp2rest/config.yaml` then restart: `pm2 restart mcp2rest` (or `mcp2rest stop && mcp2rest start` for foreground mode). Restart takes 1-2 seconds.

---

## Glossary

- **MCP Server**: A process that implements the Model Context Protocol, exposing tools and resources
- **Gateway**: The mcp2rest daemon process
- **Tool**: A function exposed by an MCP server (e.g., `navigate`, `screenshot`)
- **Hot-Reload**: Adding/removing servers without restarting the gateway
- **npx**: Node package runner that installs and executes packages on-demand

---

---

## 📋 TODO: Outstanding Features

### 🔴 High Priority

#### 1. Auto-Reconnect with Exponential Backoff
**Status:** Not implemented
**Impact:** High - Critical for production reliability
**Location:** `src/gateway/Gateway.ts`

**Requirements:**
- Implement auto-reconnect when MCP server connection lost
- Exponential backoff: 1s, 2s, 4s delays
- Max 3 reconnect attempts before marking as 'error'
- Log reconnection attempts and outcomes
- Update ServerState.reconnectAttempts counter

**Implementation Notes:**
```typescript
// Add to Gateway.ts
private async reconnectServer(name: string): Promise<void> {
  const state = this.servers.get(name);
  if (!state || state.reconnectAttempts >= 3) return;

  const delay = Math.pow(2, state.reconnectAttempts) * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));

  state.reconnectAttempts++;
  try {
    await this.connectServer(name, state.config);
  } catch (error) {
    if (state.reconnectAttempts < 3) {
      await this.reconnectServer(name);
    }
  }
}
```

#### 2. DELETE /servers/:name Endpoint
**Status:** Backend exists, endpoint missing
**Impact:** Medium - Completes REST API
**Location:** `src/api/APIServer.ts`

**Requirements:**
- Add route: `app.delete('/servers/:name', this.handleDeleteServer.bind(this))`
- Call `Gateway.removeServer(name)`
- Return success/error response
- Handle 404 if server not found

**Implementation:**
```typescript
// Add to APIServer.ts setupRoutes()
this.app.delete('/servers/:name', this.handleDeleteServer.bind(this));

// Add handler method
private async handleDeleteServer(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.params;
    await this.gateway.removeServer(name);
    res.json({
      success: true,
      message: `Server '${name}' removed successfully`
    });
  } catch (error: any) {
    // ... error handling
  }
}
```

### 🟡 Medium Priority

#### 3. Fix Response Format Inconsistencies
**Status:** Works but differs from original PRD
**Impact:** Low - Documentation mismatch
**Files:** `src/api/APIServer.ts`, Update PRD or code

**Options:**
- A) Update PRD to match implementation (DONE ✅)
- B) Update code to match original PRD format

**Decision:** Keeping current implementation, PRD updated.

#### 4. Optional CLI Commands
**Status:** Not implemented (by design)
**Impact:** Low - REST API provides functionality
**Files:** `src/bin/mcp2rest.ts`

**Possible additions** (only if user requests):
- `mcp2rest list` → Wrapper around `GET /servers`
- `mcp2rest tools <name>` → Wrapper around `GET /servers/:name/tools`
- `mcp2rest remove <name>` → Wrapper around `DELETE /servers/:name`

**Note:** These are convenience wrappers. Not recommended - encourages API-first usage.

### 🟢 Low Priority / Future Enhancements

#### 5. Winston Logging (Optional)
**Status:** Console logging works fine with PM2
**Impact:** Very Low

**Current:** Console output + PM2 log management
**Alternative:** Add Winston for structured logging

**Decision:** Console logging + PM2 is sufficient for MVP. Winston can be added post-launch if needed.

#### 6. Concurrent Request Handling
**Status:** Basic implementation sufficient
**Impact:** Low until high load

**Monitor:** Tool execution concurrency under load
**Future:** Add per-server request queuing if needed

#### 7. Response Format Standardization
**Status:** Inconsistent object vs array wrapping
**Impact:** Very Low

**Examples:**
- `/servers` returns array (not wrapped)
- `/call` returns wrapped object

**Decision:** Keep current implementation for MVP. Consider standardization in v2.0.

---

**Document Version:** 2.0 (Updated post-implementation)
**Last Updated:** January 8, 2025
**Next Review:** After auto-reconnect implementation
