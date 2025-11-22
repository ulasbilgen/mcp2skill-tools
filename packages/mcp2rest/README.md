# mcp2rest

A standalone Node.js daemon that manages multiple MCP (Model Context Protocol) servers and exposes their tools via REST API. mcp2rest provides a universal HTTP interface that allows developers using any programming language to leverage MCP tools without Node.js integration complexity.

## Features

- **Universal HTTP Interface**: Access MCP tools from any language via REST API
- **Multi-Server Management**: Connect to multiple MCP servers simultaneously
- **Dynamic Server Management**: Add/remove servers without restarting
- **Background Daemon**: Run as a system service with PM2
- **Automatic Reconnection**: Handles server disconnections gracefully
- **Simple CLI**: Easy-to-use command-line interface

## Installation

Install globally via npm:

```bash
npm install -g mcp2rest
```

## Quick Start

### 1. Start the Gateway

Start the gateway in foreground mode:

```bash
mcp2rest start
```

Or install as a system service (recommended):

```bash
mcp2rest service install
```

### 2. Add an MCP Server

Add the Chrome DevTools MCP server:

```bash
mcp2rest add chrome chrome-devtools-mcp@latest
```

### 3. Call a Tool

Use any HTTP client to call tools:

```bash
curl -X POST http://localhost:28888/call \
  -H "Content-Type: application/json" \
  -d '{
    "server": "chrome",
    "tool": "navigate",
    "arguments": {
      "url": "https://example.com"
    }
  }'
```

## API Endpoints

### Execute Tool

Execute a tool on a specific MCP server.

**Endpoint:** `POST /call`

**Request Body:**
```json
{
  "server": "chrome",
  "tool": "navigate",
  "arguments": {
    "url": "https://example.com"
  }
}
```

**Response:**
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

### List Servers

Get all connected servers and their status.

**Endpoint:** `GET /servers`

**Response:**
```json
{
  "servers": [
    {
      "name": "chrome",
      "package": "chrome-devtools-mcp@latest",
      "status": "connected",
      "toolCount": 5
    }
  ]
}
```

### Get Server Tools

List all available tools for a specific server.

**Endpoint:** `GET /servers/:name/tools`

**Response:**
```json
{
  "server": "chrome",
  "tools": [
    {
      "name": "navigate",
      "description": "Navigate to a URL",
      "inputSchema": { ... }
    }
  ]
}
```

### Add Server

Dynamically add a new MCP server.

**Endpoint:** `POST /servers`

**Request Body:**
```json
{
  "name": "filesystem",
  "package": "@modelcontextprotocol/server-filesystem",
  "args": ["/home/user/workspace"]
}
```

### Remove Server

Remove an MCP server.

**Endpoint:** `DELETE /servers/:name`

### Health Check

Check gateway health.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "serverCount": 2,
  "connectedServers": 2
}
```

### OpenAPI Specification

Get the complete API specification in OpenAPI/Swagger format.

**Endpoint:** `GET /openapi.yaml`

**Response:** YAML file with complete API specification

**Example:**
```bash
curl http://localhost:28888/openapi.yaml > mcp2rest-api.yaml
```

This specification can be used with Swagger UI, Postman, or other OpenAPI tools to explore and test the API.

## CLI Commands

### Gateway Management

```bash
# Start gateway in foreground (default port 28888)
mcp2rest start

# Start with custom port and host
mcp2rest start --port 4000 --host 0.0.0.0

# Start with custom config file
mcp2rest start --config /path/to/config.yaml

# Stop gateway
mcp2rest stop
```

### Service Management

```bash
# Install as system service
mcp2rest service install

# Uninstall service
mcp2rest service uninstall

# Check service status
mcp2rest service status

# View service logs
mcp2rest service logs

# Follow logs in real-time
mcp2rest service logs --follow
```

### Server Management

```bash
# Add a server
mcp2rest add <name> <package> [--args <arg1> <arg2>]

# Examples:
mcp2rest add chrome chrome-devtools-mcp@latest
mcp2rest add fs @modelcontextprotocol/server-filesystem --args /home/user/workspace
```

## Configuration

Configuration is stored in `~/.mcp2rest/config.yaml`:

```yaml
servers:
  chrome:
    package: chrome-devtools-mcp@latest
    args: []
  
  filesystem:
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/home/user/workspace"]

gateway:
  port: 28888
  host: localhost
  timeout: 30000
  logLevel: info
```

### Port and Host Configuration

mcp2rest supports multiple ways to configure the port and host, with the following precedence order (highest to lowest):

1. **CLI Flags** (highest priority)
2. **Environment Variables**
3. **Configuration File**
4. **Default Values** (port: 28888, host: localhost)

#### Using CLI Flags

```bash
# Start with custom port
mcp2rest start --port 4000

# Start with custom host
mcp2rest start --host 0.0.0.0

# Start with both
mcp2rest start --port 4000 --host 0.0.0.0
```

#### Using Environment Variables

```bash
# Set port via environment variable
MCP2REST_PORT=4000 mcp2rest start

# Set host via environment variable
MCP2REST_HOST=0.0.0.0 mcp2rest start

# Set both
MCP2REST_PORT=4000 MCP2REST_HOST=0.0.0.0 mcp2rest start
```

#### Using Configuration File

Edit `~/.mcp2rest/config.yaml`:

```yaml
gateway:
  port: 4000
  host: 0.0.0.0
```

#### Changing Service Port

To change the port of an installed service:

```bash
# 1. Edit the configuration file
nano ~/.mcp2rest/config.yaml
# Change gateway.port to your desired port

# 2. Reinstall the service (updates PM2 config)
mcp2rest service install

# 3. Restart the service
mcp2rest service restart
```

The service install command automatically reads the port and host from your config file and configures the PM2 service accordingly.

## Example: Python Client

```python
import requests

# Execute a tool
response = requests.post('http://localhost:28888/call', json={
    'server': 'chrome',
    'tool': 'navigate',
    'arguments': {
        'url': 'https://example.com'
    }
})

result = response.json()
print(result)
```

## Example: Go Client

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    payload := map[string]interface{}{
        "server": "chrome",
        "tool": "navigate",
        "arguments": map[string]string{
            "url": "https://example.com",
        },
    }
    
    jsonData, _ := json.Marshal(payload)
    resp, _ := http.Post(
        "http://localhost:28888/call",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    defer resp.Body.Close()
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "SERVER_NOT_FOUND",
    "message": "Server 'chrome' not found",
    "serverName": "chrome"
  }
}
```

Common error codes:
- `SERVER_NOT_FOUND`: Specified server doesn't exist
- `SERVER_DISCONNECTED`: Server is not connected
- `TOOL_NOT_FOUND`: Tool doesn't exist on server
- `TOOL_EXECUTION_ERROR`: Tool execution failed
- `TOOL_TIMEOUT`: Tool execution exceeded 30 seconds
- `INVALID_ARGUMENTS`: Invalid request parameters

## Requirements

- Node.js >= 18.0.0
- npm or npx

## Recently Completed ✅

- [x] **Custom Port & Host Configuration** (v0.2.8)
  - CLI flags: `--port` and `--host` for start command
  - Environment variables: `MCP2REST_PORT` and `MCP2REST_HOST`
  - Precedence order: CLI flags > Environment variables > Config file > Defaults
  - PM2 service integration: Automatically configures service with config file settings
  - Dynamic port detection for `add` and `remove` CLI commands

- [x] **Auto-Reconnect**: Automatic reconnection with exponential backoff when MCP servers disconnect
  - Implemented in `src/gateway/Gateway.ts`
  - Max 10 reconnection attempts with exponential backoff
  - Automatic recovery from server crashes

- [x] **DELETE Endpoint**: `DELETE /servers/:name` REST endpoint
  - Implemented in `src/api/APIServer.ts`
  - Remove servers dynamically via API

## TODO

### Medium Priority

- [ ] Optional CLI convenience commands (list, tools, remove)
  - Note: REST API already provides this functionality

### Future Enhancements

- **API Key & Authentication Support** - See [API_KEY_SUPPORT.md](./API_KEY_SUPPORT.md) for detailed implementation plan
  - HTTP headers for HTTP-based MCP servers
  - Environment variables for stdio-based MCP servers
  - Support for services like Context7, PostHog, Figma Cloud, etc.
- Rate limiting
- WebSocket support for streaming
- Web-based dashboard
- Tool result caching

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Documentation

- [openapi.yaml](./openapi.yaml) - Complete OpenAPI/Swagger specification for REST API
- [MCP_Gateway_PRD.md](./MCP_Gateway_PRD.md) - Detailed implementation specifications
- [API_KEY_SUPPORT.md](./API_KEY_SUPPORT.md) - API key and authentication implementation plan
