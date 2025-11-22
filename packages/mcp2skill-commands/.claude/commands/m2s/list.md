---
description: List available MCP servers from mcp2rest
allowed-tools: Bash(mcp2skill:*), Bash(ls:*)
---

Display all MCP servers available in mcp2rest and identify which need skills generated.

## Step 1: Get server list

Use Bash to retrieve servers from mcp2rest: `mcp2skill servers`

Parse and display the results in a clear format showing:
- Server name
- Status (connected/disconnected)
- Tool count
- Transport type (stdio/http)

## Step 2: Check for existing skills

Use Glob to check which servers already have skills generated: `~/.claude/skills/mcp-*/`

## Step 3: Compare and suggest

For each connected server with tools:
- **If skill exists:** "✓ mcp-{server-name} (skill exists)"
- **If skill missing:** "✗ {server-name} (no skill) - Use `/m2s-generate {server-name}`"

## Step 4: Provide recommendations

Based on the analysis:

**Servers ready for skill generation:**
List all connected servers without skills, ordered by tool count (most tools first).

**Servers with existing skills:**
Mention they can be updated with `/m2s-update <server-name>` if tools have changed.

**Disconnected servers:**
Suggest troubleshooting or removal if not needed.

## Step 5: Next actions

Offer specific commands the user can run:
- Generate skill: `/m2s-generate <server-name>`
- Add new server: `/m2s-add <server-name> <package>`
- Update existing: `/m2s-update <server-name>`
- Troubleshoot: Check mcp2rest logs or restart service

**Example output format:**

```
Available MCP Servers (3 total):

✓ chrome-devtools
  Status: connected
  Tools: 26
  Skill: EXISTS at ~/.claude/skills/mcp-chrome-devtools/

✗ filesystem
  Status: connected
  Tools: 8
  Skill: MISSING - Run `/m2s-generate filesystem`

! weather-api
  Status: disconnected
  Tools: 0
  Note: Server may need restart
```
