# Python Package Deprecation Kit

This document contains everything needed to deprecate the Python `mcp2skill` package and guide users to the new TypeScript `mcp2scripts` package.

## 1. Add Deprecation Warning to Python Package

### File: `mcp2skill/__init__.py`

Add this at the top of the file:

```python
"""
mcp2skill - DEPRECATED

This package has been superseded by mcp2scripts (TypeScript/JavaScript).
Please migrate to: https://www.npmjs.com/package/mcp2scripts

Migration guide: https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md
"""

import warnings
import sys

# Show deprecation warning on import
warnings.warn(
    "\n"
    "=" * 70 + "\n"
    "DEPRECATION WARNING: mcp2skill (Python) is deprecated\n"
    "=" * 70 + "\n"
    "\n"
    "This Python package has been superseded by mcp2scripts (TypeScript/JavaScript).\n"
    "\n"
    "Please migrate to the new package:\n"
    "  npm install -g mcp2scripts\n"
    "\n"
    "Migration guide:\n"
    "  https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md\n"
    "\n"
    "The Python package will receive security updates only.\n"
    "No new features will be added.\n"
    "\n"
    "=" * 70 + "\n",
    DeprecationWarning,
    stacklevel=2
)

# Make warning always visible (not just in debug mode)
warnings.filterwarnings('always', category=DeprecationWarning, module='mcp2skill')

# Rest of your existing __init__.py code...
```

### File: `mcp2skill/cli.py` (or main CLI file)

Add this at the start of the main function:

```python
def main():
    """Main CLI entrypoint with deprecation notice."""
    print("⚠️  DEPRECATION NOTICE: mcp2skill (Python) is deprecated", file=sys.stderr)
    print("   Please migrate to mcp2scripts (TypeScript/JavaScript)", file=sys.stderr)
    print("   https://www.npmjs.com/package/mcp2scripts", file=sys.stderr)
    print("", file=sys.stderr)

    # Rest of your existing CLI code...
```

## 2. Update README.md

Add this banner at the very top of your Python package README:

```markdown
# ⚠️ DEPRECATED - mcp2skill (Python)

> **This package is deprecated and will receive security updates only.**
>
> **Please migrate to [mcp2scripts](https://www.npmjs.com/package/mcp2scripts) (TypeScript/JavaScript)**
>
> **Migration guide:** [MIGRATION_FROM_PYTHON.md](https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md)

---

## Why Deprecated?

The Python version has been superseded by a TypeScript rewrite that offers:
- ✅ Faster execution
- ✅ Better integration with JavaScript ecosystem
- ✅ Active development and new features
- ✅ Full TypeScript support
- ✅ Same functionality

## Quick Migration

```bash
# Uninstall Python package
pip uninstall mcp2skill

# Install JavaScript package
npm install -g mcp2scripts

# Regenerate skills
mcp2scripts generate --all
```

**Full migration guide:** [MIGRATION_FROM_PYTHON.md](https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md)

---

## Original Documentation

*The documentation below is for reference only. For new projects, use [mcp2scripts](https://www.npmjs.com/package/mcp2scripts).*

<!-- Rest of your original README -->
```

## 3. Update setup.py or pyproject.toml

### For setup.py:

```python
from setuptools import setup, find_packages

setup(
    name='mcp2skill',
    version='0.X.Y',  # Bump version for deprecation release
    description='[DEPRECATED] Generate Python scripts from MCP Server Tools - Use mcp2scripts instead',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    author='Your Name',
    author_email='your.email@example.com',
    url='https://github.com/ulasbilgen/mcp2skill',
    packages=find_packages(),
    classifiers=[
        'Development Status :: 7 - Inactive',  # Mark as inactive
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Topic :: Software Development :: Libraries',
    ],
    python_requires='>=3.8',
    install_requires=[
        'requests>=2.31.0',
        'click>=8.1.0',
    ],
    entry_points={
        'console_scripts': [
            'mcp2skill=mcp2skill.cli:main',
        ],
    },
    # Add deprecation metadata
    project_urls={
        'Deprecated In Favor Of': 'https://www.npmjs.com/package/mcp2scripts',
        'Migration Guide': 'https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md',
        'Bug Tracker': 'https://github.com/ulasbilgen/mcp2skill/issues',
    },
)
```

### For pyproject.toml:

```toml
[project]
name = "mcp2skill"
version = "0.X.Y"
description = "[DEPRECATED] Generate Python scripts from MCP Server Tools - Use mcp2scripts instead"
readme = "README.md"
authors = [
    {name = "Your Name", email = "your.email@example.com"},
]
license = {text = "MIT"}
classifiers = [
    "Development Status :: 7 - Inactive",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.8",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
]
requires-python = ">=3.8"
dependencies = [
    "requests>=2.31.0",
    "click>=8.1.0",
]

[project.urls]
"Deprecated In Favor Of" = "https://www.npmjs.com/package/mcp2scripts"
"Migration Guide" = "https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md"
"Homepage" = "https://github.com/ulasbilgen/mcp2skill"
"Bug Tracker" = "https://github.com/ulasbilgen/mcp2skill/issues"

[project.scripts]
mcp2skill = "mcp2skill.cli:main"
```

## 4. PyPI Package Deprecation

After publishing the deprecation release:

### Step 1: Publish Deprecation Release

```bash
# Bump version (e.g., 0.5.0 -> 0.5.1)
# Build package
python -m build

# Upload to PyPI
python -m twine upload dist/*
```

### Step 2: Add PyPI Deprecation Message

On PyPI, you can add a deprecation message in the package description. Update your README.md as shown above, and it will appear on the PyPI page.

### Step 3: Yank Old Versions (Optional)

You can yank old versions to prevent new installations:

```bash
# Yank specific version (users can still specify it explicitly)
twine yank -r pypi mcp2skill==0.5.0

# Or yank multiple versions
twine yank -r pypi mcp2skill==0.4.0
twine yank -r pypi mcp2skill==0.4.1
```

**Note:** Yanking prevents `pip install mcp2skill` from installing yanked versions, but users can still install them explicitly with `pip install mcp2skill==0.5.0`.

## 5. GitHub Repository Updates

### Add Deprecation Badge to README

Add this to the top of your GitHub repository README:

```markdown
[![Deprecated](https://img.shields.io/badge/status-deprecated-red)](https://www.npmjs.com/package/mcp2scripts)
[![Superseded By](https://img.shields.io/badge/superseded%20by-mcp2scripts-blue)](https://www.npmjs.com/package/mcp2scripts)
```

### Update Repository Description

Change the GitHub repository description to:
```
[DEPRECATED] Generate Python scripts from MCP Server Tools - Use mcp2scripts instead
```

### Create DEPRECATED.md File

Create a `DEPRECATED.md` file in the root:

```markdown
# This Repository is Deprecated

This Python package has been superseded by **mcp2scripts** (TypeScript/JavaScript).

## New Package

- **Name:** mcp2scripts
- **Language:** TypeScript/JavaScript
- **NPM:** https://www.npmjs.com/package/mcp2scripts
- **Repository:** https://github.com/ulasbilgen/mcp2skill-tools

## Migration

See the [Migration Guide](https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md) for detailed instructions.

## Support

- **Security updates:** Yes (critical issues only)
- **Bug fixes:** No
- **New features:** No

For support, please use the new package: https://github.com/ulasbilgen/mcp2skill-tools
```

### Add GitHub Issue Template

Create `.github/ISSUE_TEMPLATE/deprecation_notice.md`:

```markdown
---
name: Deprecation Notice
about: This repository is deprecated
title: ''
labels: 'deprecated'
assignees: ''
---

## This Package is Deprecated

This Python package has been superseded by **mcp2scripts** (TypeScript/JavaScript).

**Please use the new package:**
- NPM: https://www.npmjs.com/package/mcp2scripts
- Repository: https://github.com/ulasbilgen/mcp2skill-tools

**Migration guide:**
https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md

If you have a critical security issue with the Python version, please provide details below.
```

### Archive Repository (Optional)

You can archive the repository on GitHub:

1. Go to repository Settings
2. Scroll to "Danger Zone"
3. Click "Archive this repository"
4. Confirm archiving

**Note:** Archiving makes the repository read-only. Issues and PRs can't be created.

## 6. Communication Plan

### Announcement

Post announcements on:

1. **GitHub Release Notes:**
   Create a release with deprecation notice

2. **PyPI Project Description:**
   Already covered in README update

3. **Social Media / Blog:**
   Announce the transition and migration path

### Sample Announcement

```markdown
# mcp2skill Python Package Deprecated

We're excited to announce that mcp2skill has been completely rewritten in TypeScript/JavaScript as **mcp2scripts**!

## What's New

- 🚀 Faster execution
- 📦 Better npm ecosystem integration
- 🔒 Full TypeScript support
- ✨ Same great functionality

## Migration

Migrating is easy:

```bash
pip uninstall mcp2skill
npm install -g mcp2scripts
mcp2scripts generate --all
```

See the full [Migration Guide](https://github.com/ulasbilgen/mcp2skill-tools/blob/main/packages/mcp2scripts/MIGRATION_FROM_PYTHON.md).

## Python Package Support

- Security updates: Yes (critical only)
- Bug fixes: No
- New features: No

Thanks for using mcp2skill! We look forward to seeing you on mcp2scripts.
```

## 7. Deprecation Checklist

Use this checklist when deprecating:

- [ ] Add deprecation warning to `__init__.py`
- [ ] Add CLI deprecation notice
- [ ] Update README.md with deprecation banner
- [ ] Update setup.py/pyproject.toml metadata
- [ ] Set classifier to "Development Status :: 7 - Inactive"
- [ ] Bump version number
- [ ] Build and publish to PyPI
- [ ] Add deprecation badge to GitHub README
- [ ] Update GitHub repository description
- [ ] Create DEPRECATED.md file
- [ ] Add issue template
- [ ] Create GitHub release with deprecation notice
- [ ] (Optional) Yank old PyPI versions
- [ ] (Optional) Archive GitHub repository
- [ ] Announce deprecation
- [ ] Update all documentation links

## 8. Timeline Recommendation

Here's a suggested deprecation timeline:

### Week 1: Soft Deprecation
- ✅ Publish mcp2scripts to npm
- ✅ Add deprecation warnings to Python package
- ✅ Update documentation
- ✅ Announce transition

### Month 1-3: Transition Period
- ✅ Both packages available
- ✅ Support critical security issues in Python
- ✅ Help users migrate
- ✅ Monitor adoption

### Month 6: Hard Deprecation
- ✅ Stop accepting Python issues
- ✅ Mark package as "Inactive" on PyPI
- ✅ Consider archiving repository

### Month 12: End of Life
- ✅ No more Python security updates
- ✅ Archive repository
- ✅ Final migration reminder

## Questions?

If you have questions about deprecating the Python package, see:
- [Migration Guide](./packages/mcp2scripts/MIGRATION_FROM_PYTHON.md)
- [mcp2scripts Documentation](./packages/mcp2scripts/README.md)
