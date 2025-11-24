# psake Documentation Expansion Plan

## Overview
This document outlines the comprehensive plan to expand and improve the psake documentation site. Use this as a reference for implementing new content across documentation pages, tutorials, and blog posts.

---

## Current State Summary

### Existing Content
- **Tutorial Basics:** 9 pages covering installation, tasks, parameters, and basic concepts
- **Tutorial Advanced:** 8 pages covering debugging, error handling, and script structure
- **Build Types:** 1 page (.NET Solution only)
- **CI/CD Examples:** 3 pages (Hudson, CruiseControl, TeamCity - all legacy)
- **Blog Posts:** 2 posts (initial announcement + August 2025 releases)
- **Command Reference:** 12 auto-generated pages

### Key Gaps Identified
1. Modern CI/CD examples (GitHub Actions, Azure Pipelines, GitLab CI)
2. Diverse build type examples (Node.js, Docker, Python, Go, etc.)
3. Troubleshooting and FAQ resources
4. Best practices documentation
5. Regular blog content utilizing unused tags
6. Integration guides for modern tools

---

## Implementation Phases

### Phase 1: Critical User Needs (Priority: HIGH)

#### 1.1 Modern CI/CD Examples
**Location:** `docs/ci-examples/`

- [ ] **github-actions.md** - Complete GitHub Actions integration example
  - Workflow YAML configuration
  - Secret management in GitHub
  - Matrix builds across OS/PowerShell versions
  - Artifact publishing

- [ ] **azure-pipelines.md** - Azure DevOps Pipelines integration
  - azure-pipelines.yml example
  - Variable groups and secrets
  - Multi-stage pipelines
  - Publishing to Azure Artifacts

- [ ] **gitlab-ci.md** - GitLab CI/CD integration
  - .gitlab-ci.yml configuration
  - CI/CD variables
  - Pipeline stages
  - Docker executor setup

**Sidebar Update:** Add these to the "CI Examples" category in `sidebars.ts`

#### 1.2 Troubleshooting Section
**Location:** `docs/troubleshooting/`

- [ ] **_category_.json** - Troubleshooting category metadata
- [ ] **common-errors.md** - Frequent errors and solutions
  - "Task not found" errors
  - Module loading issues
  - Path resolution problems
  - PowerShell version conflicts
  - Dependency cycle errors

- [ ] **faq.md** - Frequently Asked Questions
  - Installation questions
  - Basic usage questions
  - Performance questions
  - Integration questions

- [ ] **debugging-guide.md** - Complete debugging workflow
  - Using PowerShell debugger with psake
  - Verbose output options
  - Logging strategies
  - Troubleshooting task execution order

**Sidebar Update:** Add new "Troubleshooting" category after "Command Reference"

#### 1.3 Additional Build Type Examples
**Location:** `docs/build-types/`

- [ ] **nodejs.md** - Node.js/npm project builds
  - npm install/build/test tasks
  - TypeScript compilation
  - Webpack bundling
  - Publishing to npm registry

- [ ] **docker.md** - Docker-based builds
  - Building Docker images
  - Multi-stage builds
  - Pushing to registries
  - Docker Compose integration

**Sidebar Update:** Add to "Build Types" category in `sidebars.ts`

---

### Phase 2: Best Practices & Patterns (Priority: HIGH)

#### 2.1 Best Practices Section
**Location:** `docs/best-practices/`

- [ ] **_category_.json** - Best Practices category metadata
- [ ] **organizing-large-scripts.md** - Script organization patterns
  - File structure recommendations
  - Modular task organization
  - Using Include effectively
  - Shared utilities and helpers

- [ ] **environment-management.md** - Managing multiple environments
  - Dev/staging/production properties
  - Environment-specific configuration
  - Conditional task execution by environment
  - Parameter-based environment switching

- [ ] **secret-management.md** - Handling secrets and credentials
  - Environment variables approach
  - Secure string handling
  - Azure Key Vault integration
  - AWS Secrets Manager integration
  - Never commit secrets to source control

- [ ] **testing-build-scripts.md** - Testing your psake scripts
  - Pester tests for build validation
  - Mocking external commands
  - Testing task dependencies
  - CI integration for build script tests

- [ ] **versioning-strategy.md** - Build versioning approaches
  - Semantic versioning
  - Git-based versioning
  - Build number integration
  - Assembly version updates

**Sidebar Update:** Add new "Best Practices" category between "Build Types" and "Tutorial - Advanced"

#### 2.2 Blog Post Series
**Location:** `blog/`

- [ ] **2025-MM-DD-getting-started-with-psake-and-github-actions.md**
  - Tags: `tutorial`, `getting-started`, `ci-cd`, `psake`
  - Step-by-step GitHub Actions setup
  - Working example repository link

- [ ] **2025-MM-DD-psake-best-practices-for-teams.md**
  - Tags: `best-practices`, `psake`, `build-automation`
  - Team collaboration patterns
  - Code review for build scripts
  - Standardization approaches

- [ ] **2025-MM-DD-common-psake-errors-and-solutions.md**
  - Tags: `troubleshooting`, `tips`, `psake`
  - Top 10 errors with solutions
  - Debugging workflow
  - Prevention strategies

---

### Phase 3: Expand Build Types (Priority: MEDIUM)

#### 3.1 More Build Type Examples
**Location:** `docs/build-types/`

- [ ] **python.md** - Python project builds
  - Virtual environment setup
  - pip install dependencies
  - pytest integration
  - Package building (wheel, sdist)
  - Publishing to PyPI

- [ ] **go.md** - Go project builds
  - go mod download
  - go build with versioning
  - Cross-compilation
  - go test integration

- [ ] **static-site.md** - Static site generator builds
  - Jekyll/Hugo/Gatsby examples
  - Asset optimization
  - Deployment to hosting

- [ ] **database.md** - Database migration builds
  - SQL script execution
  - Entity Framework migrations
  - Flyway/Liquibase integration
  - Rollback strategies

- [ ] **monorepo.md** - Monorepo/multi-project builds
  - Detecting changed projects
  - Selective builds
  - Shared dependencies
  - Build ordering

**Sidebar Update:** Add all to "Build Types" category

#### 3.2 Integration Guides
**Location:** `docs/integrations/` (new section)

- [ ] **_category_.json** - Integrations category metadata
- [ ] **package-publishing.md** - Publishing packages
  - NuGet publishing
  - Chocolatey package creation
  - PowerShell Gallery publishing
  - npm registry publishing

- [ ] **code-quality.md** - Code quality tool integration
  - PSScriptAnalyzer integration
  - SonarQube analysis
  - Code coverage reporting

- [ ] **notifications.md** - Build notifications
  - Slack webhooks
  - Microsoft Teams connectors
  - Email notifications
  - Custom webhooks

- [ ] **deployment.md** - Deployment scenarios
  - IIS deployment
  - Azure App Service
  - AWS deployments
  - Kubernetes deployments

**Sidebar Update:** Add new "Integrations" category after "Best Practices"

---

### Phase 4: Advanced Content (Priority: MEDIUM)

#### 4.1 Advanced Topics
**Location:** `docs/tutorial-advanced/`

- [ ] **build-caching.md** - Caching strategies
  - When to use caching
  - Implementing cache invalidation
  - CI/CD cache integration

- [ ] **incremental-builds.md** - Incremental build patterns
  - Change detection
  - Partial rebuilds
  - Dependency tracking

- [ ] **powershellbuild-integration.md** - PowerShellBuild module
  - What is PowerShellBuild
  - Integration with psake
  - Common patterns
  - When to use each tool

- [ ] **custom-extensions.md** - Extending psake
  - Creating custom functions
  - Shared task libraries
  - Plugin patterns (if applicable)

**Sidebar Update:** Add to existing "Tutorial - Advanced" category

#### 4.2 Migration & Comparison Guides
**Location:** `docs/migration/` (new section)

- [ ] **_category_.json** - Migration category metadata
- [ ] **from-msbuild.md** - Migrating from MSBuild
  - Equivalent patterns
  - Converting MSBuild tasks
  - When to keep MSBuild
  - Hybrid approaches

- [ ] **from-make-rake.md** - Migrating from Make/Rake
  - Syntax comparison
  - Dependency patterns
  - Task equivalents

- [ ] **psake-vs-invoke-build.md** - Comparison guide
  - Feature comparison table
  - Use case recommendations
  - Migration considerations

- [ ] **combining-tools.md** - Using psake with other tools
  - psake + MSBuild
  - psake + Invoke-Build
  - psake + PowerShellBuild
  - When to combine vs replace

**Sidebar Update:** Add new "Migration Guides" category after "Integrations"

---

### Phase 5: Quick Wins (Priority: LOW - Easy to implement)

#### 5.1 Reference Pages
**Location:** `docs/reference/` (new section)

- [ ] **_category_.json** - Reference category metadata
- [ ] **glossary.md** - Term definitions
  - Task, Dependency, Property, etc.
  - Clear explanations for beginners

- [ ] **cheat-sheet.md** - Quick reference
  - Common task patterns
  - Useful one-liners
  - Parameter formats

- [ ] **configuration-reference.md** - All configuration options
  - Framework targeting
  - Build script settings
  - Context object properties ($psake)

- [ ] **exit-codes.md** - Exit code reference
  - Success/failure codes
  - Error code meanings
  - CI/CD integration handling

**Sidebar Update:** Add new "Reference" category before "Code of Conduct"

#### 5.2 Cleanup Tasks
- [ ] Review `docs/tutorial-basics/parameters.md` vs `parameters-properties.md` for duplication
- [ ] Add cross-references between related pages
- [ ] Update intro.md with links to new sections

---

## Blog Content Strategy

### Blog Post Ideas by Tag

#### Using `tutorial` tag:
- "Your First psake Build Script: A Complete Walkthrough"
- "Understanding psake Task Dependencies"
- "Advanced Task Patterns in psake"
- "Building a Complete CI/CD Pipeline with psake"

#### Using `getting-started` tag:
- "psake for .NET Developers: Quick Start Guide"
- "psake for Python Developers"
- "Zero to Production Build in 10 Minutes with psake"

#### Using `best-practices` tag:
- "10 psake Best Practices Every Developer Should Know"
- "Structuring Team Build Scripts for Success"
- "Secret Management in psake: Do's and Don'ts"

#### Using `tips` tag:
- "5 Time-Saving psake Tricks"
- "Hidden psake Features You Didn't Know About"
- "psake Productivity Shortcuts"

#### Using `troubleshooting` tag:
- "Debugging Failed psake Builds: A Step-by-Step Guide"
- "Common psake Errors Explained"
- "When psake Won't Run: Troubleshooting Guide"

#### Using `ci-cd` tag:
- "psake + GitHub Actions: The Perfect Match"
- "Running psake in Azure DevOps Pipelines"
- "Setting Up psake in GitLab CI/CD"
- "Multi-Platform Builds with psake and CI/CD"

#### Using `testing` tag:
- "Testing Your Build Scripts with Pester"
- "Validating psake Configurations"
- "Automated Testing for Build Automation"

#### Using `deployment` tag:
- "Deploying to Azure with psake"
- "Container Deployment Workflows Using psake"
- "Multi-Environment Deployments Made Easy"

#### Using `msbuild` tag:
- "Integrating MSBuild with psake"
- "When to Use MSBuild vs psake"
- "Hybrid Build Approaches: Best of Both Worlds"

#### Using `dotnet` tag:
- "Building .NET Core Projects with psake"
- ".NET Solution Builds: Advanced Patterns"
- "Publishing .NET Applications Using psake"

#### Using `visual-studio` tag:
- "Visual Studio Integration with psake"
- "Building Visual Studio Solutions at Scale"

### Monthly Blog Cadence (Suggested)
- **Week 1:** Tutorial or Getting Started post
- **Week 2:** Tips & Tricks or Best Practices post
- **Week 3:** Integration or CI/CD focused post
- **Week 4:** Community spotlight or release announcement

---

## Important Notes for Implementation

### Content Requirements

#### Documentation Pages
1. **Required frontmatter:**
   ```yaml
   ---
   title: "Clear, descriptive title"
   description: "SEO-friendly description"
   sidebar_position: X  # optional, for ordering
   ---
   ```

2. **Structure guidelines:**
   - Start with clear introduction
   - Use semantic headings (##, ###)
   - Include code examples with syntax highlighting
   - Add cross-references to related pages
   - Include a "See Also" section at the end

3. **Code block format:**
   ````markdown
   ```powershell
   Task Example {
       # Your code here
   }
   ```
   ````

#### Blog Posts
1. **File naming:** `YYYY-MM-DD-descriptive-slug.md`

2. **Required frontmatter:**
   ```yaml
   ---
   title: "Clear, descriptive title"
   description: "SEO-friendly description (150-160 chars)"
   date: YYYY-MM-DDTHH:MM:SS.SSSZ  # ISO format
   authors:
     - heyitsgilbert
   tags:
     - psake
     - other-relevant-tags
   ---
   ```

3. **Structure requirements:**
   - Engaging intro paragraph
   - `<!-- truncate -->` after first paragraph
   - Semantic headings
   - Practical examples
   - Clear takeaways/conclusion

#### Sidebar Updates
After creating new pages, update `sidebars.ts`:

```typescript
{
  type: 'category',
  label: 'New Section Name',
  items: [
    'folder/new-page-1',
    'folder/new-page-2',
  ]
}
```

### Available Tag Handles for Blog Posts
`powershell`, `build-automation`, `psake`, `ci-cd`, `testing`, `deployment`, `scripting`, `tutorial`, `getting-started`, `advanced`, `best-practices`, `tips`, `troubleshooting`, `release`, `announcement`, `msbuild`, `dotnet`, `visual-studio`

### Build Commands
```powershell
# Install dependencies
.\build.ps1 -Task Init

# Start development server (hot reload)
yarn run start

# Run tests (validates sidebar links)
.\build.ps1 -Task Test

# Production build
.\build.ps1 -Task Build

# Serve production build
.\build.ps1 -Task Server
```

### Testing Requirements
- All new documentation pages MUST be linked in `sidebars.ts`
- Run `.\build.ps1 -Task Test` before committing
- Preview changes with `yarn run start`
- Validate no broken links in build output

---

## Success Metrics

### Content Goals
- [ ] Add 15+ new documentation pages
- [ ] Publish 10+ blog posts in next 3 months
- [ ] Cover all major build types (5+ examples)
- [ ] Document all modern CI/CD platforms (3+ examples)
- [ ] Create comprehensive best practices section (5+ guides)

### Quality Goals
- [ ] All pages have clear examples
- [ ] All pages link to related content
- [ ] All blog tags have at least 2 posts
- [ ] No broken links (validated by build)
- [ ] All pages pass sidebar tests

---

## Getting Started

### Recommended Starting Point
**Phase 1, Task 1.1:** Modern CI/CD Examples

Start with `docs/ci-examples/github-actions.md` because:
1. GitHub Actions is the most popular modern CI/CD platform
2. High user demand and immediate value
3. Clear, well-documented API to work with
4. Sets pattern for other CI/CD examples

### Implementation Workflow
1. Choose a task from the plan
2. Create the markdown file in appropriate location
3. Write content following guidelines above
4. Update `sidebars.ts` if needed
5. Run `yarn run start` to preview
6. Run `.\build.ps1 -Task Test` to validate
7. Commit changes

---

## Questions or Issues?
- Review existing pages for style/format reference
- Check `CLAUDE.md` for project-specific guidance
- Ensure auto-generated command reference files aren't modified
- Remember: YAML files are source of truth for authors/tags
