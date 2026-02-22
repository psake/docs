# Plan: Add PowerShellBuild Documentation Section

## Background

PowerShellBuild is the official companion module to psake (same GitHub org: `psake/PowerShellBuild`). It provides reusable, pre-packaged build tasks for PowerShell module projects — covering build, test, analysis, help generation, signing, and publishing. It leverages psake's shared-task feature (introduced in v4.8.0) so module authors get a full pipeline with minimal configuration. Currently, the psake docs site has zero coverage of PowerShellBuild (it's listed as a future Phase 4 item in `DOCUMENTATION_EXPANSION_PLAN.md`).

## Proposed Structure

Create a new `docs/powershellbuild/` directory with five focused pages, added as a **"PowerShellBuild" category** in the `guidesSidebar` (positioned between "Advanced Techniques" and "Build Type Examples").

### Files to Create

#### 1. `docs/powershellbuild/_category_.json`
Category metadata for Docusaurus sidebar auto-generation.

```json
{
  "label": "PowerShellBuild",
  "position": 3,
  "link": {
    "type": "generated-index",
    "description": "Learn how to use PowerShellBuild, the official companion module that provides reusable psake tasks for building, testing, and publishing PowerShell modules."
  }
}
```

#### 2. `docs/powershellbuild/introduction.md`
**Purpose:** What PowerShellBuild is, why it exists, and how it relates to psake.

Content outline:
- What is PowerShellBuild (companion module providing shared psake tasks)
- The problem it solves (boilerplate reduction for PS module authors)
- Relationship to psake — psake is the engine, PowerShellBuild is the pre-built task library
- Also supports Invoke-Build (brief mention, link to their docs)
- When to use PowerShellBuild vs. writing custom psake tasks
- Links to GitHub repo and PowerShell Gallery

#### 3. `docs/powershellbuild/getting-started.md`
**Purpose:** Step-by-step guide to add PowerShellBuild to a PowerShell module project.

Content outline:
- Prerequisites (psake >= 4.9.0, PowerShell 5.1+/7+)
- Installation (`Install-Module -Name PowerShellBuild`)
- Minimal psakeFile.ps1 example using `-FromModule PowerShellBuild`
- Expected directory structure for a PowerShell module project
- Running the build (`Invoke-psake`)
- What happens when you run Build (walkthrough of the task chain: Init → Clean → StageFiles → BuildHelp → Build)
- Invoke-Build alternative (dot-sourcing via `PowerShellBuild.IB.Tasks` alias)

#### 4. `docs/powershellbuild/task-reference.md`
**Purpose:** Complete reference of all pre-built tasks with their dependencies and behavior.

Content outline:
- Primary tasks table (Init, Clean, Build, Analyze, Pester, Test, Publish, Sign)
- Secondary tasks table (StageFiles, BuildHelp, GenerateMarkdown, GenerateMAML, GenerateUpdatableHelp, SignModule, BuildCatalog, SignCatalog)
- Mermaid diagram showing the full task dependency graph
- Description of each task's behavior
- How to run specific tasks (`Invoke-psake -taskList Analyze`)

#### 5. `docs/powershellbuild/configuration.md`
**Purpose:** Complete reference for `$PSBPreference` and task dependency customization.

Content outline:
- Overview of `$PSBPreference` hashtable
- Configuration categories with all options:
  - General (ProjectRoot, SrcRootDir, ModuleName, etc.)
  - Build (OutDir, CompileModule, CompileDirectories, CopyDirectories, Exclude)
  - Test (Enabled, RootDir, OutputFile, OutputFormat, OutputVerbosity)
  - Script Analysis (Enabled, FailBuildOnSeverityLevel, SettingsPath)
  - Code Coverage (Enabled, Threshold, OutputFileFormat)
  - Help (DefaultLocale, UpdatableHelpOutDir, ConvertReadMeToAboutHelp)
  - Docs (RootDir, Overwrite, AlphabeticParamsOrder, UseFullTypeName)
  - Publish (PSRepository, PSRepositoryApiKey, PSRepositoryCredential)
  - Sign (Enabled, CertificateSource, Thumbprint, TimestampServer, HashAlgorithm)
- Example: Customizing configuration in the `properties` block
- Task dependency variables ($PSBBuildDependency, $PSBTestDependency, etc.)
- Example: Changing task dependency chains

#### 6. `docs/powershellbuild/real-world-example.md`
**Purpose:** A complete, end-to-end example showing PowerShellBuild in a real project.

Content outline:
- Complete project structure (directory tree)
- Full psakeFile.ps1 with customized preferences and added custom tasks
- build.ps1 bootstrap wrapper
- requirements.psd1 with PowerShellBuild dependency
- CI/CD integration (GitHub Actions workflow using PowerShellBuild tasks)
- Publishing to PSGallery via the Publish task
- Combining custom tasks with PowerShellBuild tasks (e.g., adding a Deploy task that depends on Publish)

### File to Modify

#### `sidebars.ts`
Add a new "PowerShellBuild" category to `guidesSidebar`, between "Advanced Techniques" and "Build Type Examples":

```typescript
{
  type: 'category',
  label: 'PowerShellBuild',
  items: [
    'powershellbuild/introduction',
    'powershellbuild/getting-started',
    'powershellbuild/task-reference',
    'powershellbuild/configuration',
    'powershellbuild/real-world-example',
  ],
},
```

## Implementation Steps

1. Create `docs/powershellbuild/_category_.json`
2. Create `docs/powershellbuild/introduction.md`
3. Create `docs/powershellbuild/getting-started.md`
4. Create `docs/powershellbuild/task-reference.md`
5. Create `docs/powershellbuild/configuration.md`
6. Create `docs/powershellbuild/real-world-example.md`
7. Update `sidebars.ts` — add PowerShellBuild category to `guidesSidebar`
8. Verify: run `yarn run start` or `.\build.ps1 -Task Test` to validate sidebar links and build

## Conventions to Follow

- **Frontmatter:** Each `.md` file gets `title` and `description` fields
- **Structure:** Intro paragraph → main sections with `##` headings → code examples → "See Also" links
- **Code blocks:** Use ` ```powershell ` for PS examples, ` ```yaml ` for CI configs
- **Cross-references:** Link to existing psake docs (e.g., tasks, properties, CI/CD examples)
- **No emoji** unless the user explicitly requests them
- **Mermaid diagrams** are supported and enabled in docusaurus config — use for the task dependency graph
