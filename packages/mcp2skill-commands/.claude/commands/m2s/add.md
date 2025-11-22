---
description: Add a new MCP server to mcp2rest
argument-hint: <server-name> [package-or-url]
allowed-tools: Bash(mcp2rest:*), Bash(mcp2skill:*), AskUserQuestion
---

Add a new MCP server to mcp2rest with the name "$1".

## Step 1: Determine server details

**If $2 is provided (package or URL):**
- Detect if it's a URL (starts with http://) or npm package
- Skip to Step 3

**If $2 is NOT provided:**
- Ask user for transport type and package/URL details
- Continue to Step 2

## Step 2: Gather server information

Ask the user:

**Transport type:**
1. **stdio** - Standard npm package that runs as subprocess (most common)
   - Examples: `chrome-devtools-mcp@latest`, `@modelcontextprotocol/server-filesystem`
2. **http** - Remote MCP server accessed via HTTP
   - Examples: `http://127.0.0.1:3845/mcp`, `http://localhost:8080/mcp`

**For stdio transport:**
- Ask: "What is the npm package name?"
- Examples to suggest:
  - `chrome-devtools-mcp@latest` (browser automation)
  - `@modelcontextprotocol/server-filesystem` (file operations)
  - `@modelcontextprotocol/server-github` (GitHub integration)
  - Custom package name

**For http transport:**
- Ask: "What is the HTTP URL?"
- Format: `http://host:port/path`
- Example: `http://127.0.0.1:3845/mcp`

## Step 3: Execute mcp2rest add command

**For stdio (npm package):**
```bash
mcp2rest add $1 <package-name>
```

**For http (URL):**
```bash
mcp2rest add $1 --url <http-url>
```

Run the appropriate command.

## Step 4: Verify server loaded

After adding, use Bash to check server status: `mcp2skill servers`

Look for "$1" in the output:
- **If status = "connected":** Success! Show tool count
- **If status = "disconnected":** Check logs, suggest troubleshooting
- **If not found:** Something went wrong, check mcp2rest output

## Step 5: Next steps

**If server connected successfully:**
- Show: "✓ Server '$1' added successfully with X tools"
- Suggest: "Generate skill with: `/m2s-generate $1`"
- Optional: Ask if they want to generate the skill now

**If server failed to connect:**
- Show error message from mcp2rest
- Suggest troubleshooting:
  1. Check package name is correct
  2. Verify npm package exists: `npm info <package>`
  3. For http: verify URL is accessible
  4. Check mcp2rest logs: `mcp2rest logs` or `mcp2rest service logs`
  5. Restart mcp2rest: `mcp2rest service restart`

## Popular MCP Servers

Provide a list of common servers users might want to add:

**Browser Automation:**
- `chrome-devtools-mcp@latest`

**File Operations:**
- `@modelcontextprotocol/server-filesystem`

**Development:**
- `@modelcontextprotocol/server-github`
- `@modelcontextprotocol/server-git`

**Data & APIs:**
- `@modelcontextprotocol/server-postgres`
- `@modelcontextprotocol/server-sqlite`

**More:** https://github.com/modelcontextprotocol/servers
