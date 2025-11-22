# Migration Guide: Python mcp2skill → TypeScript mcp2scripts

This guide helps you migrate from the deprecated Python `mcp2skill` package to the new TypeScript `mcp2scripts` package.

## Why Migrate?

The TypeScript rewrite offers:
- **Faster execution** - Node.js startup is faster than Python
- **Better integration** - Native JavaScript ecosystem compatibility
- **Same functionality** - All features from Python version
- **Active development** - Ongoing support and new features
- **Type safety** - Full TypeScript support

## Migration Steps

### 1. Uninstall Python Package

```bash
pip uninstall mcp2skill
```

### 2. Install TypeScript Package

**Global installation (recommended):**
```bash
npm install -g mcp2scripts
```

**Or use with npx:**
```bash
npx mcp2scripts --version
```

### 3. Verify Installation

```bash
mcp2scripts --version
# Should output: 0.1.0
```

### 4. Update Your Workflows

Replace Python commands with JavaScript equivalents:

**Before (Python):**
```bash
# List servers
mcp2skill servers

# Generate skill
mcp2skill generate chrome-devtools

# Generate all
mcp2skill generate --all
```

**After (JavaScript):**
```bash
# List servers
mcp2scripts servers

# Generate skill
mcp2scripts generate chrome-devtools

# Generate all
mcp2scripts generate --all
```

### 5. Regenerate Existing Skills

Your old Python-generated skills will still work, but we recommend regenerating them with the new JavaScript version:

```bash
# Delete old skills (backup first if needed)
rm -rf ~/.claude/skills/mcp-*

# Regenerate with mcp2scripts
mcp2scripts generate --all
```

## Command Comparison

All commands are nearly identical:

| Python mcp2skill | JavaScript mcp2scripts | Notes |
|-----------------|------------------------|-------|
| `mcp2skill servers` | `mcp2scripts servers` | Same output format |
| `mcp2skill generate <name>` | `mcp2scripts generate <name>` | Same behavior |
| `mcp2skill generate --all` | `mcp2scripts generate --all` | Same behavior |
| `mcp2skill tools <name>` | `mcp2scripts tools <name>` | Same output |
| `--endpoint <url>` | `--endpoint <url>` | Same flag |
| `-o, --output <dir>` | `-o, --output <dir>` | Same flag |

## Generated Files Comparison

### Directory Structure

Both versions generate the same directory structure:

```
~/.claude/skills/mcp-{server-name}/
├── SKILL.md              # Same format
└── scripts/
    ├── mcp_client.{py,js}  # Language-specific
    ├── tool1.{py,js}       # Language-specific
    └── tool2.{py,js}       # Language-specific
```

### SKILL.md Format

The SKILL.md format is identical between Python and JavaScript versions:
- Same YAML frontmatter
- Same tool categorization
- Same documentation structure

### Script Differences

The main difference is the scripting language:

**Python version:**
```python
#!/usr/bin/env python3
import argparse
from mcp_client import call_tool

# ... Python code
```

**JavaScript version:**
```javascript
#!/usr/bin/env node
import { program } from 'commander';
import { callTool } from './mcp_client.js';

// ... JavaScript code
```

**Usage is the same:**
```bash
# Python
python scripts/navigate.py --url https://example.com

# JavaScript
node scripts/navigate.js --url https://example.com
```

## API Comparison (Programmatic Usage)

### Python API

```python
from mcp2skill import SkillGenerator

gen = SkillGenerator('http://localhost:28888')
servers = gen.list_servers()
result = gen.generate_skill('chrome-devtools')
```

### JavaScript API

```javascript
import { ScriptGenerator } from 'mcp2scripts';

const gen = new ScriptGenerator('http://localhost:28888');
const servers = await gen.listServers();
const result = await gen.generateSkill('chrome-devtools');
```

**Key differences:**
- Class name: `SkillGenerator` → `ScriptGenerator`
- Async: Python sync → JavaScript async/await
- Naming: snake_case → camelCase

## Configuration Changes

### Environment Variables

Both versions support the same environment variables:

```bash
# Python and JavaScript both support:
export MCP_REST_URL=http://localhost:28888

# Python
mcp2skill generate chrome-devtools

# JavaScript
mcp2scripts generate chrome-devtools
```

### Output Directory

Default output directory remains the same:
- `~/.claude/skills/` (both versions)

## Breaking Changes

### 1. Script Language

**Impact:** Generated scripts change from Python to JavaScript

**Action:** Regenerate all skills with `mcp2scripts generate --all`

**Why:** Claude Code works equally well with both languages

### 2. Package Name

**Impact:** Import statements change in programmatic usage

**Action:** Update your code:
```python
# Before
from mcp2skill import SkillGenerator

# After (JavaScript)
import { ScriptGenerator } from 'mcp2scripts';
```

### 3. Installation Method

**Impact:** Package manager changes from pip to npm

**Action:**
```bash
# Before
pip install mcp2skill

# After
npm install -g mcp2scripts
```

## Compatibility

### Claude Code Compatibility

Both versions are fully compatible with Claude Code:
- ✅ Same skill discovery mechanism
- ✅ Same SKILL.md format
- ✅ Same directory structure
- ✅ Same mcp2rest integration

### mcp2rest Compatibility

Both versions work with the same mcp2rest API:
- ✅ Same REST endpoints
- ✅ Same request/response format
- ✅ Same server lifecycle

## Troubleshooting

### Issue: "mcp2scripts: command not found"

**Solution:**
```bash
# Install globally
npm install -g mcp2scripts

# Or use npx
npx mcp2scripts servers

# Or add npm global bin to PATH
export PATH="$PATH:$(npm bin -g)"
```

### Issue: "Cannot find module 'mcp2scripts'"

**Solution:**
```bash
# Install in project
npm install mcp2scripts

# Or install globally
npm install -g mcp2scripts
```

### Issue: Old Python skills still running

**Solution:**
```bash
# Remove old skills
rm -rf ~/.claude/skills/mcp-*

# Regenerate with JavaScript
mcp2scripts generate --all
```

### Issue: Scripts fail with "python: command not found"

**Cause:** Old Python-generated scripts

**Solution:** Regenerate skills with `mcp2scripts generate --all`

## Feature Parity

All Python features are available in JavaScript:

| Feature | Python | JavaScript |
|---------|--------|------------|
| List servers | ✅ | ✅ |
| Generate single skill | ✅ | ✅ |
| Generate all skills | ✅ | ✅ |
| Show tools | ✅ | ✅ |
| Custom endpoint | ✅ | ✅ |
| Custom output directory | ✅ | ✅ |
| Environment variable override | ✅ | ✅ |
| JSON Schema conversion | ✅ | ✅ |
| Tool categorization | ✅ | ✅ |
| Required field validation | ✅ | ✅ |
| Type coercion | ✅ | ✅ |
| Path expansion (~/) | ✅ | ✅ |
| Error handling | ✅ | ✅ |
| Programmatic API | ✅ | ✅ |
| TypeScript support | ❌ | ✅ |

## Benefits of JavaScript Version

### 1. Performance

- **Faster startup:** Node.js typically starts faster than Python
- **Async I/O:** Better handling of concurrent operations
- **Lower memory:** Smaller runtime footprint

### 2. Ecosystem

- **NPM packages:** Access to 2M+ packages
- **TypeScript:** Full type safety
- **Modern tooling:** Better IDE support

### 3. Maintenance

- **Active development:** Ongoing updates and features
- **Bug fixes:** Faster response to issues
- **Community:** Growing user base

## Getting Help

If you encounter issues during migration:

1. **Check documentation:**
   - [mcp2scripts README](./README.md)
   - [Examples](./examples/)
   - [Troubleshooting](./README.md#troubleshooting)

2. **Report issues:**
   - [GitHub Issues](https://github.com/ulasbilgen/mcp2skill-tools/issues)

3. **Ask questions:**
   - Open a discussion on GitHub
   - Check existing issues for solutions

## Timeline

- **Now:** Python package marked as deprecated
- **Today:** JavaScript package available on npm
- **Future:** Python package will receive security updates only
- **Eventually:** Python package archived (no further updates)

## Conclusion

Migration from Python to JavaScript is straightforward:

1. ✅ Uninstall Python package
2. ✅ Install JavaScript package
3. ✅ Regenerate skills
4. ✅ Update any automation scripts

The JavaScript version provides the same functionality with better performance and ongoing support.

**Ready to migrate? Run:**
```bash
pip uninstall mcp2skill
npm install -g mcp2scripts
mcp2scripts generate --all
```
