---
description: Setup mcp2rest and mcp2skill for first-time use
allowed-tools: Bash(which:*), Bash(npm:*), Bash(pip:*), Bash(mcp2rest:*), Bash(mcp2skill:*), Bash(curl:*)
---

Guide the user through initial setup of mcp2skill and mcp2rest.

## Step 1: Check mcp2rest installation

Check if mcp2rest is installed: !`which mcp2rest`

**If not installed:**
- Explain: "mcp2rest is a Node.js service that manages MCP servers via REST API"
- Install: `npm install -g mcp2rest`
- Verify: !`which mcp2rest`

**If installed:**
- Show version: !`mcp2rest --version`

## Step 2: Check mcp2skill installation

Check if mcp2skill is installed: !`pip show mcp2skill`

**If not installed:**
- Explain: "mcp2skill generates Claude Code skills from mcp2rest servers"
- Install: `pip install mcp2skill`
- Verify: !`pip show mcp2skill`

**If installed:**
- Show version from output

## Step 3: Start mcp2rest service

Check if mcp2rest is already running: !`curl -s http://localhost:28888/health 2>/dev/null || echo "not running"`

**If not running:**
- Explain the options:
  1. Run temporarily: `mcp2rest start` (stops when terminal closes)
  2. Install as system service: `mcp2rest service install && mcp2rest service start` (recommended)
- Recommend option 2 for persistent background service
- After starting, verify: !`curl http://localhost:28888/health`

**If already running:**
- Confirm it's working properly
- Check status: !`curl http://localhost:28888/health`

## Step 4: Check for existing servers

List current servers: !`mcp2skill servers`

**If no servers:**
- Ask user: "Would you like to add your first MCP server now?"
- If yes: Guide them to use `/m2s-add` command
- Suggest popular servers:
  - `chrome-devtools-mcp@latest` (browser automation)
  - `@modelcontextprotocol/server-filesystem` (file operations)
  - Custom servers they may have

**If servers exist:**
- Show the list
- Ask: "Would you like to generate skills for any of these? Use `/m2s-generate <server-name>`"

## Step 5: Summary

Provide a summary:
- ✓ mcp2rest: [installed/not installed]
- ✓ mcp2rest service: [running/not running]
- ✓ mcp2skill: [installed/not installed]
- ✓ Servers loaded: [count]

**Next steps:**
1. Add servers: `/m2s-add <server-name> <package>`
2. List servers: `/m2s-list`
3. Generate skills: `/m2s-generate <server-name>`

**Resources:**
- mcp2rest: https://github.com/ulasbilgen/mcp2rest
- mcp2skill: https://github.com/ulasbilgen/mcp2skill
- MCP servers: https://github.com/modelcontextprotocol/servers
