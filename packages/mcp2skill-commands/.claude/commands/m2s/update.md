---
description: Update existing skill with new tools or improved documentation
argument-hint: <server-name>
allowed-tools: Bash(mcp2scripts:*), Bash(ls:*), Bash(cat:*), Bash(grep:*), Bash(wc:*), Bash(cp:*), Bash(node:*), Bash(npm:*), Read, Write, AskUserQuestion, Glob
---

Update the Claude Code skill for MCP server "$1" with latest tools and improved documentation.

## Step 1: Verify skill exists

Use Glob to check if skill exists in either location:
- Project skills: `./.claude/skills/mcp-$1/`
- User skills: `~/.claude/skills/mcp-$1/`

**If skill doesn't exist in either location:**
- Inform user: "Skill for '$1' not found in ./.claude/skills/ or ~/.claude/skills/. Use `/m2s:generate $1` to create it first."
- Stop here

**If skill exists:**
- Store the location in `SKILL_PATH` variable (either `./.claude/skills` or `~/.claude/skills`)
- Use Glob to show current structure: `$SKILL_PATH/mcp-$1/**/*`
- Continue to Step 2

## Step 2: Get current tool list from skill

Use Glob to list current scripts (these are the old tools): `$SKILL_PATH/mcp-$1/scripts/*.js` (excluding mcp_client.js and package.json)

Count current tools and show them.

## Step 3: Get latest tools from mcp2rest

Use Bash to get current tools from server: `mcp2scripts tools $1`

Parse and count the tools available now.

## Step 4: Compare and detect changes

Compare the tool counts and names:

**If tool count differs:**
- Show: "Tools have changed: {old-count} → {new-count}"
- List new tools (in server but not in scripts/)
- List removed tools (in scripts/ but not in server)
- Recommend: "I suggest regenerating JavaScript scripts"

**If tool count same:**
- Show: "Tool count unchanged ({count} tools)"
- But note: "Tool descriptions or parameters may have changed"
- Ask: "Would you like to check for schema changes or just improve documentation?"

## Step 5: Ask user what to update

Present options:

1. **Regenerate scripts only** - Keep SKILL.md, regenerate JavaScript scripts
   - Use when: Tools changed but documentation is still good

2. **Improve SKILL.md only** - Keep scripts, enhance documentation
   - Use when: Tools unchanged but docs need improvement
   - Apply latest best practices from ./.claude/commands/m2s/docs/skill-authoring-guide.md

3. **Full regeneration** - Recreate entire skill
   - Use when: Major tool changes or significant doc improvements needed
   - Same as `/m2s-generate $1` but preserves any custom notes

4. **Cancel** - No changes needed

## Step 6: Execute chosen update

### Option 1: Regenerate scripts only

1. Use Bash to backup current scripts: `cp -r $SKILL_PATH/mcp-$1/scripts $SKILL_PATH/mcp-$1/scripts.backup`
2. Determine the appropriate command:
   - If `$SKILL_PATH` is `./.claude/skills`: `mcp2scripts generate $1`
   - If `$SKILL_PATH` is `~/.claude/skills`: `mcp2scripts generate $1 --user`
3. Use Bash to regenerate with the appropriate command
4. Use Bash to install dependencies: `cd $SKILL_PATH/mcp-$1/scripts && npm install`
5. Use Glob to verify: `$SKILL_PATH/mcp-$1/scripts/*.js`
6. Inform: "Scripts updated. SKILL.md unchanged. Dependencies installed. Backup at scripts.backup/"

### Option 2: Improve SKILL.md only

1. Use Read tool for current SKILL.md: `$SKILL_PATH/mcp-$1/SKILL.md`
2. Analyze against ./.claude/commands/m2s/docs/skill-authoring-guide.md best practices:
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

1. Use Grep tool to check if user had customizations: search for "custom|note:" in `$SKILL_PATH/mcp-$1/SKILL.md`
2. If customizations found:
   - Extract and save them
   - Offer to include in new version
3. Run full regeneration (same as `/m2s-generate $1`)
4. After generation, install dependencies: `cd $SKILL_PATH/mcp-$1/scripts && npm install`
5. If customizations existed, offer to merge them back

## Step 7: Validate updates

After any update, validate:

**For script updates:**
- Check script count matches tool count
- Use Glob to verify all scripts: `$SKILL_PATH/mcp-$1/scripts/*.js`
- Use Bash to test one script: `node $SKILL_PATH/mcp-$1/scripts/{first-tool}.js --help`
- Verify npm install completed: check for `node_modules/` directory

**For SKILL.md updates:**
- Use Read tool to check line count: `$SKILL_PATH/mcp-$1/SKILL.md`
- Verify YAML frontmatter is valid
- Check all file references exist: @workflows/, @reference/

## Step 8: Summary

Provide update summary:
```
✓ Skill updated: $SKILL_PATH/mcp-$1/

Changes:
  {what-was-updated}

Before:
  - Tools: {old-count}
  - SKILL.md: {old-lines} lines

After:
  - Tools: {new-count}
  - SKILL.md: {new-lines} lines
  - Dependencies: installed via npm
  - {additional changes}

Backups:
  - {list any backups created}
```

**Next steps:**
1. Test the updated skill
2. Claude Code will use the latest version automatically
3. Review changes: `diff $SKILL_PATH/mcp-$1/SKILL.md{.backup,}`
4. Remove backups if satisfied: `rm -rf $SKILL_PATH/mcp-$1/*.backup`

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
- Compare tool count: `mcp2scripts tools $1 | grep "^Tools for"`
