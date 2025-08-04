# Copilot Instructions for psake Documentation Site

## Project Overview
This is a **Docusaurus-based documentation site** for [psake](https://github.com/psake/psake), a PowerShell build automation tool. The site combines static documentation, auto-generated command references, and a blog using a hybrid PowerShell/Node.js build system.

## Architecture & Key Components

### Build System (PowerShell + psake)
- **Entry point**: `build.ps1` - main build orchestrator using psake tasks
- **Task definitions**: `psakeFile.ps1` - contains all build tasks and automation
- **Dependencies**: `requirements.psd1` - PowerShell module dependencies managed via PSDepend
- **Key tasks**: `Init` (yarn install), `Build` (full site), `Server` (dev server), `Test` (Pester tests)

### Content Management
- **Docs**: `/docs/` - structured tutorials and guides (Markdown)
- **Blog**: `/blog/` - timestamped posts with frontmatter metadata
- **Command reference**: Auto-generated from psake module using `Alt3.Docusaurus.Powershell`
- **Data files**: `blog/authors.yml` and `blog/tags.yml` (YAML format, synced to JSON for Frontmatter CMS)

### Frontmatter CMS Integration
- **Config**: `frontmatter.json` - defines content types, fields, and datafile mappings
- **Data sync**: psake task `FrontMatterCMSSync` converts YAML→JSON for CMS consumption
- **Author/tag management**: Uses datafiles with `handle` as labelField for dropdowns

## Development Workflows

### Quick Start
```powershell
# Bootstrap dependencies (first time only)
.\build.ps1 -Bootstrap

# Start development server
.\build.ps1 -Task Server
```

### Build & Test
```powershell
# Full build (includes command reference generation)
.\build.ps1 -Task Build

# Run tests (validates sidebar links)
.\build.ps1 -Task Test

# List all available tasks
.\build.ps1 -Help
```

### Command Reference Generation
The site auto-generates MDX files for psake commands:
- Source: psake PowerShell module help
- Generator: `New-DocusaurusHelp` from Alt3.Docusaurus.Powershell
- Output: `docs/commands/*.mdx` with automatic cross-reference link fixing
- Sidebar: Auto-imported via `docs/commands/docusaurus.sidebar.js`

## Key Conventions

### Content Structure
- **Tutorials**: Follow `tutorial-basics/` and `tutorial-advanced/` patterns
- **Categories**: Use `_category_.json` files for folder metadata
- **Blog posts**: Format: `YYYY-MM-DD-title.md` with required frontmatter fields
- **Sidebar**: Manually maintained in `sidebars.ts` (validated by tests)

### Data Management
- **Authors**: Define in `blog/authors.yml` with handle as key
- **Tags**: Define in `blog/tags.yml` with label, permalink, description
- **Sync process**: YAML files are source of truth, JSON files are generated

### Frontmatter Fields
- **Blog posts**: Use `authors` and `tags` arrays with handle values
- **Docs**: Support full Docusaurus metadata (sidebar_position, etc.)
- **Content types**: Different field sets for blog, docs, pages

### Blog Post Frontmatter Best Practices
**Required fields for all blog posts:**
```yaml
---
title: "Clear, descriptive title"
description: "SEO-friendly description (150-160 chars recommended)"
date: 2025-08-03T23:38:05.100Z  # Auto-generated, use ISO format
authors:
  - heyitsgilbert  # Use author handle from blog/authors.yml
tags:
  - psake          # Use tag handles from blog/tags.yml
  - announcement   # Multiple tags recommended for discoverability
---
```

**File naming convention:** `YYYY-MM-DD-slug-title.md` (date prefix required)

**Content structure:**
- Start with engaging intro paragraph
- Add `<!-- truncate -->` after first paragraph for blog list previews
- Use semantic headings (## for main sections)
- Include code examples with proper language tags

**Available tag handles:**
- `powershell`, `build-automation`, `psake`, `ci-cd`
- `testing`, `deployment`, `scripting`, `tutorial`
- `getting-started`, `advanced`, `best-practices`, `tips`
- `troubleshooting`, `release`, `announcement`
- `msbuild`, `dotnet`, `visual-studio`

**Optional but recommended fields:**
- `slug`: Custom URL (auto-generated from filename if omitted)
- `image`: Social media preview image
- `keywords`: Additional SEO keywords array
- `draft: true`: Hide from production until ready

## Testing & Quality
- **Pester tests**: Validate all docs are linked in sidebar (`tests/Docs.Tests.ps1`)
- **Build validation**: Yarn build fails on broken links
- **Content validation**: Frontmatter CMS enforces field requirements

## Deployment
- **Platform**: Netlify (auto-deploy from main branch)
- **Build command**: `.\build.ps1 -Task Build` (generates static site to `/build`)
- **Preview**: Local server on http://localhost:3000

## File Patterns to Follow
- **New tutorials**: Add to appropriate category in `sidebars.ts`
- **New blog posts**: Use existing post as template, update authors/tags arrays
- **Command docs**: Auto-generated, edit source help in psake repo
- **Data changes**: Edit YAML files, run `FrontMatterCMSSync` task to regenerate JSON

### Blog Post Creation Checklist
1. **File naming**: Use `YYYY-MM-DD-descriptive-slug.md` format
2. **Frontmatter validation**: Ensure all required fields are present
3. **Author verification**: Confirm author handle exists in `blog/authors.yml`
4. **Tag validation**: Use only handles defined in `blog/tags.yml`
5. **Content structure**: Include intro + `<!-- truncate -->` + main content
6. **SEO optimization**: Add description (150-160 chars) and relevant keywords
7. **Testing**: Run `.\build.ps1 -Task Test` to validate sidebar links
8. **Preview**: Use `.\build.ps1 -Task Server` to review locally before publishing

### Adding New Authors or Tags
- **Authors**: Add to `blog/authors.yml` with handle, name, title, url, image_url, socials
- **Tags**: Add to `blog/tags.yml` with label, permalink, description
- **Sync**: Run `.\build.ps1 -Task FrontMatterCMSSync` to update CMS choices files

## Dependencies
- **Node.js**: >=18.0 (managed via package.json engines)
- **PowerShell**: 7+ (required by psakeFile.ps1)
- **Package manager**: Yarn (locked version in packageManager field)
- **PowerShell modules**: Auto-installed via PSDepend on bootstrap
