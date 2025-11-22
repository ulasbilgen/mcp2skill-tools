# API Key Support Implementation Plan

## Overview

This document outlines the implementation plan for adding API key and authentication support to mcp2rest for both HTTP and stdio transports.

## Current State

### What's Already Implemented

The MCP SDK (`@modelcontextprotocol/sdk` v1.21.0) already supports authentication through:

1. **StdioClientTransport** - Environment variables via `env` parameter
2. **StreamableHTTPClientTransport** - HTTP headers via `requestInit.headers` option

However, mcp2rest currently does not pass these parameters through to the SDK.

### What's Missing

mcp2rest needs to:
1. Accept headers and environment variables in configuration
2. Pass these values to the respective transport constructors
3. Support CLI options for adding servers with authentication
4. Document authentication patterns for users

## Authentication Patterns

### Pattern 1: HTTP with Headers

Used by services like Context7, Figma Cloud, etc.

**Configuration Example:**
```yaml
servers:
  context7:
    url: https://mcp.context7.com/mcp
    headers:
      CONTEXT7_API_KEY: ctx7sk-YOUR_API_KEY_HERE
```

**CLI Usage:**
```bash
mcp2rest add context7 https://mcp.context7.com/mcp \
  -H CONTEXT7_API_KEY=ctx7sk-YOUR_API_KEY_HERE
```

**API Request:**
```bash
curl -X POST http://localhost:28888/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "context7",
    "url": "https://mcp.context7.com/mcp",
    "headers": {
      "CONTEXT7_API_KEY": "ctx7sk-YOUR_API_KEY_HERE"
    }
  }'
```

### Pattern 2: Stdio with Environment Variables

Used by services like PostHog (via mcp-remote).

**Configuration Example:**
```yaml
servers:
  posthog:
    package: mcp-remote@latest
    args:
      - mcp.posthog.com/sse
      - --header
      - Authorization:${POSTHOG_AUTH_HEADER}
    env:
      POSTHOG_AUTH_HEADER: Bearer phx_YOUR_TOKEN_HERE
```

**CLI Usage:**
```bash
mcp2rest add posthog mcp-remote@latest \
  --args mcp.posthog.com/sse --header 'Authorization:${POSTHOG_AUTH_HEADER}' \
  -e POSTHOG_AUTH_HEADER='Bearer phx_YOUR_TOKEN_HERE'
```

### Pattern 3: Stdio with Direct CLI Arguments

Used by services like Upstash Context7.

**Configuration Example:**
```yaml
servers:
  upstash:
    package: "@upstash/context7-mcp"
    args:
      - --api-key
      - YOUR_API_KEY
```

**CLI Usage:**
```bash
mcp2rest add upstash @upstash/context7-mcp --args --api-key YOUR_API_KEY
```

**Note:** This pattern already works with current implementation - no changes needed.

## Implementation Steps

### Step 1: Update Type Definitions

**File:** `src/types/index.ts`

**Current Code (lines 6-15):**
```typescript
export interface ServerConfig {
  name: string;
  // For stdio transport
  package?: string;
  args?: string[];
  // For HTTP transport
  url?: string;
  // Optional explicit transport type
  transport?: 'stdio' | 'http';
}
```

**Updated Code:**
```typescript
export interface ServerConfig {
  name: string;
  // For stdio transport
  package?: string;
  args?: string[];
  env?: Record<string, string>;  // NEW: Environment variables for stdio
  // For HTTP transport
  url?: string;
  headers?: Record<string, string>;  // NEW: HTTP headers
  // Optional explicit transport type
  transport?: 'stdio' | 'http';
}
```

### Step 2: Update Gateway Implementation

**File:** `src/gateway/Gateway.ts`

**Change 1: Stdio Transport (around line 110-116)**

**Current Code:**
```typescript
if (transportType === 'stdio') {
  // STDIO: Spawn process with npx
  const args = [serverConfig.package!, ...(serverConfig.args || [])];
  transport = new StdioClientTransport({
    command: 'npx',
    args: args
  });
```

**Updated Code:**
```typescript
if (transportType === 'stdio') {
  // STDIO: Spawn process with npx
  const args = [serverConfig.package!, ...(serverConfig.args || [])];
  transport = new StdioClientTransport({
    command: 'npx',
    args: args,
    env: serverConfig.env  // ADD: Pass environment variables
  });
```

**Change 2: HTTP Transport (around line 131)**

**Current Code:**
```typescript
transport = new StreamableHTTPClientTransport(serverUrl);
```

**Updated Code:**
```typescript
transport = new StreamableHTTPClientTransport(
  serverUrl,
  serverConfig.headers ? {
    requestInit: {
      headers: serverConfig.headers
    }
  } : undefined
);
```

### Step 3: Update API Server

**File:** `src/api/APIServer.ts`

**Change 1: Request Body Destructuring (line 142)**

**Current Code:**
```typescript
const { name, package: pkg, args, url, transport } = req.body;
```

**Updated Code:**
```typescript
const { name, package: pkg, args, url, transport, headers, env } = req.body;
```

**Change 2: Pass to Gateway (lines 178-183)**

**Current Code:**
```typescript
await this.gateway.addServer(name, {
  package: pkg,
  args,
  url,
  transport
});
```

**Updated Code:**
```typescript
await this.gateway.addServer(name, {
  package: pkg,
  args,
  url,
  transport,
  headers,
  env
});
```

### Step 4: Update CLI

**File:** `src/bin/mcp2rest.ts`

**Change 1: Add Options to Add Command (after line 433)**

**Current Code:**
```typescript
program
  .command('add <name> <package-or-url>')
  .description('Add a new MCP server to the gateway')
  .option('-t, --transport <type>', 'Transport type: stdio or http (auto-detected if not specified)')
  .option('-a, --args <args...>', 'Additional arguments for the server (stdio only)')
```

**Updated Code:**
```typescript
program
  .command('add <name> <package-or-url>')
  .description('Add a new MCP server to the gateway')
  .option('-t, --transport <type>', 'Transport type: stdio or http (auto-detected if not specified)')
  .option('-a, --args <args...>', 'Additional arguments for the server (stdio only)')
  .option('-H, --header <key=value...>', 'HTTP headers (http only, repeatable)')
  .option('-e, --env <key=value...>', 'Environment variables (stdio only, repeatable)')
```

**Change 2: Parse Headers and Env Vars (after line 458)**

Add this code after building the basic requestBody:

```typescript
// Parse headers if provided (for HTTP transport)
if (options.header) {
  requestBody.headers = {};
  for (const header of options.header) {
    const [key, ...valueParts] = header.split('=');
    const value = valueParts.join('='); // Handle values with '=' in them
    requestBody.headers[key] = value;
  }
}

// Parse env vars if provided (for stdio transport)
if (options.env) {
  requestBody.env = {};
  for (const envVar of options.env) {
    const [key, ...valueParts] = envVar.split('=');
    const value = valueParts.join('='); // Handle values with '=' in them
    requestBody.env[key] = value;
  }
}
```

### Step 5: Update Version

**File:** `package.json`

Update version from `0.2.6` to `0.2.7`:

```json
{
  "name": "mcp2rest",
  "version": "0.2.7",
  ...
}
```

## Testing Strategy

### Test 1: HTTP with Headers (Context7)

**Setup:**
```bash
# Build and install
npm run build
npm install -g .

# Start service
mcp2rest start

# Add server with API key
mcp2rest add context7 https://mcp.context7.com/mcp \
  -H CONTEXT7_API_KEY=ctx7sk-YOUR_API_KEY_HERE
```

**Verify:**
```bash
# List servers
mcp2rest list

# Should show context7 connected with tools
```

### Test 2: Stdio with Environment Variables (PostHog-style)

**Setup:**
```bash
mcp2rest add posthog mcp-remote@latest \
  --args mcp.posthog.com/sse --header 'Authorization:${POSTHOG_AUTH_HEADER}' \
  -e POSTHOG_AUTH_HEADER='Bearer phx_YOUR_TOKEN'
```

**Verify:**
```bash
# Check server status
mcp2rest list

# Should show posthog connected
```

### Test 3: API Endpoint

**Setup:**
```bash
curl -X POST http://localhost:28888/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-http",
    "url": "https://mcp.context7.com/mcp",
    "headers": {
      "CONTEXT7_API_KEY": "ctx7sk-test"
    }
  }'
```

**Verify:**
```bash
curl http://localhost:28888/servers
# Should include test-http in the list
```

### Test 4: Backward Compatibility

**Verify existing configs still work:**
```bash
# Add chrome-devtools (no auth required)
mcp2rest add chrome-devtools chrome-devtools-mcp@latest

# Should work as before
mcp2rest list
```

## Security Considerations

### 1. Secrets in Configuration Files

**Issue:** API keys will be stored in plaintext in `~/.mcp2rest/config.yaml`

**Mitigations:**
- Config file should have `600` permissions (user-only read/write)
- Document this security model clearly
- Consider warning users during `mcp2rest add` when API keys are detected
- Future enhancement: Support external secret managers (HashiCorp Vault, AWS Secrets Manager)

### 2. API Exposure

**Issue:** API endpoints expose headers/env vars

**Mitigations:**
- Do NOT log full headers/env vars in error messages
- Consider masking sensitive values in `/servers` endpoint response
- Implement field filtering (show `CONTEXT7_API_KEY: "ctx7sk-***..."`)

### 3. Environment Variable Expansion

**Issue:** Current implementation doesn't support `${VAR}` substitution in config files

**Future Enhancement:**
- Add support for reading from process environment
- Example: `API_KEY: ${CONTEXT7_API_KEY}` reads from shell environment
- Reduces secrets in config files

### 4. HTTP Headers Security

**Considerations:**
- Headers are sent over HTTPS for HTTP transport
- Ensure URLs use HTTPS for sensitive headers
- Consider warning when headers are used with HTTP (not HTTPS) URLs

## Configuration Examples

### Complete config.yaml Example

```yaml
servers:
  # HTTP transport with headers
  context7:
    url: https://mcp.context7.com/mcp
    headers:
      CONTEXT7_API_KEY: ctx7sk-YOUR_API_KEY_HERE

  # HTTP transport - Figma (requires auth)
  figma-cloud:
    url: https://mcp.figma.com/mcp
    headers:
      Authorization: Bearer YOUR_FIGMA_TOKEN

  # Stdio with environment variables
  posthog:
    package: mcp-remote@latest
    args:
      - mcp.posthog.com/sse
      - --header
      - Authorization:${POSTHOG_AUTH_HEADER}
    env:
      POSTHOG_AUTH_HEADER: Bearer phx_YOUR_TOKEN

  # Stdio with direct args (no env needed)
  upstash:
    package: "@upstash/context7-mcp"
    args:
      - --api-key
      - YOUR_API_KEY

  # No auth required
  chrome-devtools:
    package: chrome-devtools-mcp@latest

  # Local HTTP server (no auth)
  figma-desktop:
    url: http://127.0.0.1:3845/mcp

gateway:
  port: 3000
  host: localhost
  timeout: 30000
  logLevel: info
```

## API Documentation Updates

### POST /servers - Add Server

**Request Body:**
```typescript
{
  name: string;              // Required: Server name

  // Stdio transport fields
  package?: string;          // NPM package name
  args?: string[];          // CLI arguments
  env?: Record<string, string>;  // NEW: Environment variables

  // HTTP transport fields
  url?: string;             // Server URL
  headers?: Record<string, string>;  // NEW: HTTP headers

  // Optional
  transport?: 'stdio' | 'http';  // Auto-detected if not specified
}
```

**Example Requests:**

1. HTTP with headers:
```json
{
  "name": "context7",
  "url": "https://mcp.context7.com/mcp",
  "headers": {
    "CONTEXT7_API_KEY": "ctx7sk-xxx"
  }
}
```

2. Stdio with env vars:
```json
{
  "name": "posthog",
  "package": "mcp-remote@latest",
  "args": ["mcp.posthog.com/sse", "--header", "Authorization:${POSTHOG_AUTH_HEADER}"],
  "env": {
    "POSTHOG_AUTH_HEADER": "Bearer phx_xxx"
  }
}
```

### GET /servers - List Servers

**Response includes auth status but NOT secrets:**
```json
{
  "servers": [
    {
      "name": "context7",
      "transport": "http",
      "url": "https://mcp.context7.com/mcp",
      "status": "connected",
      "toolCount": 5,
      "hasHeaders": true  // NEW: Indicates headers are configured
    },
    {
      "name": "posthog",
      "transport": "stdio",
      "package": "mcp-remote@latest",
      "status": "connected",
      "toolCount": 3,
      "hasEnv": true  // NEW: Indicates env vars are configured
    }
  ]
}
```

## Backward Compatibility

All changes are **100% backward compatible**:

- ✅ Existing configs without `headers`/`env` continue to work
- ✅ Optional fields - no breaking changes to API
- ✅ CLI flags are additive (no changes to existing options)
- ✅ Servers without authentication work as before

## Future Enhancements

### 1. Environment Variable Substitution
Support `${VAR}` syntax in config files to read from process environment:
```yaml
servers:
  context7:
    url: https://mcp.context7.com/mcp
    headers:
      CONTEXT7_API_KEY: ${CONTEXT7_API_KEY}  # Read from env
```

### 2. Secret Masking in Responses
Mask sensitive values in API responses:
```json
{
  "name": "context7",
  "headers": {
    "CONTEXT7_API_KEY": "ctx7sk-***...c6d"
  }
}
```

### 3. Secret Manager Integration
Support external secret storage:
```yaml
servers:
  context7:
    url: https://mcp.context7.com/mcp
    headers:
      CONTEXT7_API_KEY:
        secretManager: vault
        secretPath: mcp/context7/api-key
```

### 4. HTTPS Enforcement
Warn or block when sensitive headers are used with non-HTTPS URLs.

### 5. Interactive Key Prompting
```bash
mcp2rest add context7 https://mcp.context7.com/mcp
# Prompt: Enter API key for CONTEXT7_API_KEY: [hidden input]
```

## Implementation Checklist

- [ ] Update `src/types/index.ts` - Add headers/env to ServerConfig
- [ ] Update `src/gateway/Gateway.ts` - Pass headers to HTTP transport
- [ ] Update `src/gateway/Gateway.ts` - Pass env to stdio transport
- [ ] Update `src/api/APIServer.ts` - Accept headers/env in request
- [ ] Update `src/bin/mcp2rest.ts` - Add -H and -e CLI options
- [ ] Update `package.json` - Bump version to 0.2.7
- [ ] Add tests for HTTP with headers
- [ ] Add tests for stdio with env vars
- [ ] Test backward compatibility
- [ ] Update main README with authentication examples
- [ ] Build and publish to npm
- [ ] Update CHANGELOG.md

## MCP SDK Reference

### StdioClientTransport Constructor
```typescript
constructor(parameters: StdioServerParameters)

interface StdioServerParameters {
  command: string;
  args?: string[];
  env?: Record<string, string>;  // Merged with default env (PATH, HOME, etc.)
  stderr?: 'inherit' | 'ignore' | Transport;
  cwd?: string;
}
```

**Source:** `@modelcontextprotocol/sdk/dist/esm/client/stdio.d.ts:19`

### StreamableHTTPClientTransport Constructor
```typescript
constructor(url: URL, opts?: StreamableHTTPClientTransportOptions)

interface StreamableHTTPClientTransportOptions {
  requestInit?: RequestInit;  // Standard Fetch API RequestInit
}

interface RequestInit {
  headers?: HeadersInit;  // Record<string, string> | Headers | [string, string][]
  method?: string;
  body?: BodyInit;
  // ... other fetch options
}
```

**Source:** `@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.d.ts:76-77`

---

**Document Version:** 1.0
**Created:** 2025-11-08
**Status:** Ready for Implementation
