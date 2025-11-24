# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Docusaurus-based documentation site for [psake](https://github.com/psake/psake), a PowerShell build automation tool. The site uses a hybrid PowerShell/Node.js build system, combining static documentation with auto-generated command references from the psake PowerShell module.

## Build System Architecture

The build system uses **PowerShell + psake** for orchestration, with Docusaurus/Node.js for the site generation:

- **`build.ps1`** - Main entry point that handles bootstrapping and invokes psake tasks
- **`psakeFile.ps1`** - Task definitions for all build automation
- **`requirements.psd1`** - PowerShell module dependencies (managed via PSDepend)

### Common Build Commands

```powershell
# First-time setup (install all dependencies)
.\build.ps1 -Bootstrap

# Start development server
.\build.ps1 -Task Server

# Full production build
.\build.ps1 -Task Build

# Run tests (validates sidebar links)
.\build.ps1 -Task Test

# List all available tasks
.\build.ps1 -Help
```

**Important**: The `Server` task runs `yarn serve` which serves the production build. For local development with hot-reload, use:
```powershell
.\build.ps1 -Task Init        # Install dependencies first
yarn run start                # Then start dev server directly
```

### Key Build Tasks

- **Init** - Runs `yarn install`
- **Build** - Full site build (depends on Init, GenerateCommandReference, FrontMatterCMSSync)
- **Server** - Serves production build
- **Test** - Runs Pester tests
- **GenerateCommandReference** - Auto-generates MDX files for psake commands
- **FrontMatterCMSSync** - Converts YAML datafiles to JSON for Frontmatter CMS

## Content Architecture

### Command Reference Auto-Generation

Command documentation is **auto-generated** from the psake PowerShell module:

- **Generator**: `New-DocusaurusHelp` from `Alt3.Docusaurus.Powershell` module
- **Source**: psake module help (from the main psake repository)
- **Output**: `docs/commands/*.mdx` files
- **Sidebar**: Auto-imported via `docs/commands/docusaurus.sidebar.js`
- **Configuration**: See `$docusaurusOptions` in `psakeFile.ps1:12-34`

**Never manually edit files in `docs/commands/`** - they will be overwritten. Edit the source help in the [psake repository](https://github.com/psake/psake) instead.

### Blog Post Management

Blog posts use **YAML datafiles** as the source of truth for authors and tags:

- **Authors**: `blog/authors.yml` (handle as key)
- **Tags**: `blog/tags.yml` (with label, permalink, description)
- **Sync**: Run `.\build.ps1 -Task FrontMatterCMSSync` after editing YAML files to regenerate JSON

#### Blog Post Requirements

**File naming**: `YYYY-MM-DD-descriptive-slug.md`

**Required frontmatter**:
```yaml
---
title: "Clear, descriptive title"
description: "SEO-friendly description (150-160 chars)"
date: 2025-08-03T23:38:05.100Z  # ISO format
authors:
  - heyitsgilbert  # Handle from blog/authors.yml
tags:
  - psake          # Handles from blog/tags.yml
  - announcement
---
```

**Content structure**:
- Engaging intro paragraph
- `<!-- truncate -->` after first paragraph (for blog list previews)
- Semantic headings (## for main sections)

**Available tag handles**: `powershell`, `build-automation`, `psake`, `ci-cd`, `testing`, `deployment`, `scripting`, `tutorial`, `getting-started`, `advanced`, `best-practices`, `tips`, `troubleshooting`, `release`, `announcement`, `msbuild`, `dotnet`, `visual-studio`

### Documentation Structure

- **Tutorials**: `docs/tutorial-basics/` and `docs/tutorial-advanced/`
- **Categories**: Use `_category_.json` files for folder metadata
- **Sidebar**: Manually maintained in `sidebars.ts` (validated by Pester tests)

## Frontmatter CMS Integration

The site uses Frontmatter CMS for content management:

- **Config**: `frontmatter.json` - defines content types, fields, and datafile mappings
- **Author/tag dropdowns**: Use `handle` as labelField from datafiles
- **After YAML changes**: Run `FrontMatterCMSSync` task to update CMS choices

## Testing & Validation

- **Pester tests**: `tests/Docs.Tests.ps1` - validates all docs are linked in sidebar
- **Build validation**: Docusaurus build fails on broken links (`onBrokenLinks: 'throw'` in config)
- **Blog validation**: Warns on inline tags/authors, untruncated posts

Run tests before committing:
```powershell
.\build.ps1 -Task Test
```

## Deployment

- **Platform**: Netlify (auto-deploy from `main` branch)
- **Build output**: `/build` directory (static site)
- **Preview URL**: Local server runs on http://localhost:3000

## Key Conventions

1. **All docs must be linked in `sidebars.ts`** - Pester tests enforce this
2. **YAML files are source of truth** - JSON files are generated, don't edit them
3. **Command docs are auto-generated** - Edit source help in psake repo, not MDX files
4. **Blog posts require frontmatter validation** - Missing required fields will cause warnings

## Dependencies

- **Node.js**: >=18.0 (specified in package.json engines)
- **PowerShell**: 7+ (required by psakeFile.ps1)
- **Package manager**: Yarn (locked version via packageManager field)
- **PowerShell modules**: Auto-installed via PSDepend during bootstrap

## Adding New Content

### New Blog Post Checklist
1. Use `YYYY-MM-DD-slug.md` naming
2. Add required frontmatter (title, description, date, authors, tags)
3. Verify author handle exists in `blog/authors.yml`
4. Verify tag handles exist in `blog/tags.yml`
5. Include intro + `<!-- truncate -->` + main content
6. Run `.\build.ps1 -Task Test` to validate
7. Preview with `yarn run start`

### New Author or Tag
1. Add to `blog/authors.yml` or `blog/tags.yml`
2. Run `.\build.ps1 -Task FrontMatterCMSSync`

### New Documentation Page
1. Add markdown file to appropriate `docs/` subdirectory
2. Update `sidebars.ts` to include the new page
3. Run `.\build.ps1 -Task Test` to ensure it's properly linked
