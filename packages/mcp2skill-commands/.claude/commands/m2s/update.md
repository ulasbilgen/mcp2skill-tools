---
description: Update existing skill with new tools or improved documentation
argument-hint: <server-name>
allowed-tools: Bash(mcp2skill:*), Bash(ls:*), Bash(cat:*), Bash(grep:*), Bash(wc:*), Bash(cp:*), Bash(python:*), Read, Write, AskUserQuestion
---

Update the Claude Code skill for MCP server "$1" with latest tools and improved documentation.

## Step 1: Verify skill exists

Use Glob to check if skill exists: `~/.claude/skills/mcp-$1/`

**If skill doesn't exist:**
- Inform user: "Skill for '$1' not found. Use `/m2s:generate $1` to create it first."
- Stop here

**If skill exists:**
- Use Glob to show current structure: `~/.claude/skills/mcp-$1/**/*`
- Continue to Step 2

## Step 2: Get current tool list from skill

Use Glob to list current scripts (these are the old tools): `~/.claude/skills/mcp-$1/scripts/*.py` (excluding mcp_client.py)

Count current tools and show them.

## Step 3: Get latest tools from mcp2rest

Use Bash to get current tools from server: `mcp2skill tools $1`

Parse and count the tools available now.

## Step 4: Compare and detect changes

Compare the tool counts and names:

**If tool count differs:**
- Show: "Tools have changed: {old-count} → {new-count}"
- List new tools (in server but not in scripts/)
- List removed tools (in scripts/ but not in server)
- Recommend: "I suggest regenerating Python scripts"

**If tool count same:**
- Show: "Tool count unchanged ({count} tools)"
- But note: "Tool descriptions or parameters may have changed"
- Ask: "Would you like to check for schema changes or just improve documentation?"

## Step 5: Ask user what to update

Present options:

1. **Regenerate scripts only** - Keep SKILL.md, regenerate Python scripts
   - Use when: Tools changed but documentation is still good

2. **Improve SKILL.md only** - Keep scripts, enhance documentation
   - Use when: Tools unchanged but docs need improvement
   - Apply latest best practices from @docs/skill-authoring-guide.md

3. **Full regeneration** - Recreate entire skill
   - Use when: Major tool changes or significant doc improvements needed
   - Same as `/m2s-generate $1` but preserves any custom notes

4. **Cancel** - No changes needed

## Step 6: Execute chosen update

### Option 1: Regenerate scripts only

1. Use Bash to backup current scripts: `cp -r ~/.claude/skills/mcp-$1/scripts ~/.claude/skills/mcp-$1/scripts.backup`
2. Use Bash to regenerate: `mcp2skill generate $1`
3. Use Glob to verify: `~/.claude/skills/mcp-$1/scripts/*.py`
4. Inform: "Scripts updated. SKILL.md unchanged. Backup at scripts.backup/"

### Option 2: Improve SKILL.md only

1. Use Read tool for current SKILL.md: `~/.claude/skills/mcp-$1/SKILL.md`
2. Analyze against @docs/skill-authoring-guide.md best practices:
   - Check line count (should be <500)
   - Verify concrete examples exist
   - Check for checklists in workflows
   - Validate progressive disclosure (if complex)
   - Check description quality
3. Suggest improvements:
   - "Add workflow checklists for X"
   - "Split into reference files (currently {lines} lines)"
   - "Add input/output examples for Y workflow"
   - "Improve description to mention Z capability"
4. Ask: "Which improvements should I make?"
5. Apply improvements and show preview
6. Backup original: `SKILL.md.backup`

### Option 3: Full regeneration

1. Use Grep tool to check if user had customizations: search for "custom|note:" in `~/.claude/skills/mcp-$1/SKILL.md`
2. If customizations found:
   - Extract and save them
   - Offer to include in new version
3. Run full regeneration (same as `/m2s-generate $1`)
4. If customizations existed, offer to merge them back

## Step 7: Validate updates

After any update, validate:

**For script updates:**
- Check script count matches tool count
- Use Glob to verify all scripts: `~/.claude/skills/mcp-$1/scripts/*.py`
- Use Bash to test one script: `python ~/.claude/skills/mcp-$1/scripts/{first-tool}.py --help`

**For SKILL.md updates:**
- Use Read tool to check line count: `~/.claude/skills/mcp-$1/SKILL.md`
- Verify YAML frontmatter is valid
- Check all file references exist: @workflows/, @reference/

## Step 8: Summary

Provide update summary:
```
✓ Skill updated: ~/.claude/skills/mcp-$1/

Changes:
  {what-was-updated}

Before:
  - Tools: {old-count}
  - SKILL.md: {old-lines} lines

After:
  - Tools: {new-count}
  - SKILL.md: {new-lines} lines
  - {additional changes}

Backups:
  - {list any backups created}
```

**Next steps:**
1. Test the updated skill
2. Claude Code will use the latest version automatically
3. Review changes: `diff ~/.claude/skills/mcp-$1/SKILL.md{.backup,}`
4. Remove backups if satisfied: `rm -rf ~/.claude/skills/mcp-$1/*.backup`

## Best Practices for Updates

**When to update:**
- MCP server added new tools
- Tool schemas changed (parameters added/removed)
- Documentation needs improvement
- Applying latest skill authoring best practices

**When NOT to update:**
- Skill is working well and tools haven't changed
- Minor doc typos (just edit SKILL.md directly)
- Customizations would be lost (backup first!)

**Tip:** Before updating, check what changed in the server:
- Review mcp2rest changelog
- Check server's release notes
- Compare tool count: `mcp2skill tools $1 | grep "^Tools for"`
