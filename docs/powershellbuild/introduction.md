---
title: "Introduction to PowerShellBuild"
description: "Learn what PowerShellBuild is, how it relates to psake, and when to use it for building PowerShell modules."
---

# Introduction to PowerShellBuild

[PowerShellBuild](https://github.com/psake/PowerShellBuild) is the official companion module to psake. Where psake is a general-purpose build automation engine, PowerShellBuild is a curated library of pre-built psake tasks that handle every step of a PowerShell module's lifecycle — building, testing, analysis, help generation, signing, and publishing — so you don't have to write that scaffolding from scratch.

## The Problem It Solves

Every PowerShell module project needs roughly the same build pipeline:

1. Clean the output directory
2. Stage (copy/compile) module files to the output
3. Run PSScriptAnalyzer for code quality
4. Run Pester tests
5. Generate MAML help from PlatyPS markdown
6. Publish to the PowerShell Gallery

Writing this pipeline from scratch in every project is repetitive. If you discover a better pattern (say, a smarter way to compute code coverage), you'd have to update every project manually. PowerShellBuild solves this by packaging the pipeline as a versioned, distributable module — update the module version and all your projects get the improvement.

## How It Relates to psake

PowerShellBuild lives under the same GitHub organization as psake (`psake/PowerShellBuild`) and is built on a feature introduced in **psake v4.8.0**: the ability to reference shared tasks distributed inside a PowerShell module.

```
┌─────────────────────────────────────┐
│  Your project's psakeFile.ps1       │
│                                     │
│  task Build -FromModule             │
│      PowerShellBuild -Version 0.7.1 │
└────────────────┬────────────────────┘
                 │ psake loads tasks from
                 ▼
┌─────────────────────────────────────┐
│  PowerShellBuild module             │
│  (Init → Clean → StageFiles →       │
│   BuildHelp → Build → ...)          │
└─────────────────────────────────────┘
```

When psake encounters a task declared with `-FromModule`, it automatically loads that task (and all its dependencies) from the installed module and runs them as if they were defined locally. Your `psakeFile.ps1` stays minimal; PowerShellBuild handles the details.

## Also Supports Invoke-Build

PowerShellBuild is not limited to psake. It ships Invoke-Build task files as well, accessible through the `PowerShellBuild.IB.Tasks` PowerShell alias. See the [PowerShellBuild README](https://github.com/psake/PowerShellBuild/blob/main/README.md) for Invoke-Build usage. The rest of this section focuses on the psake integration.

## When to Use PowerShellBuild

**Use PowerShellBuild when:**
- You are building a PowerShell module (`.psd1` / `.psm1`) and want a standardized pipeline
- You want to avoid writing boilerplate psake tasks that every PS module project needs
- You want your build pipeline versioned and shareable across multiple module projects

**Write custom psake tasks instead when:**
- You are building something other than a PowerShell module (a .NET solution, a Node.js app, a Docker image, etc.)
- You need a workflow that significantly deviates from the standard module structure
- You are using psake purely for orchestration of external tools

## Installation

Install PowerShellBuild from the PowerShell Gallery:

```powershell
Install-Module -Name PowerShellBuild -Repository PSGallery
```

psake v4.9.0 or later is also required:

```powershell
Install-Module -Name psake -Repository PSGallery
```

Or declare both as dependencies in a `requirements.psd1` (managed via [PSDepend](https://github.com/RamblingCookieMonster/PSDepend)):

```powershell
@{
    psake            = 'latest'
    PowerShellBuild  = 'latest'
}
```

## See Also

- [Getting Started with PowerShellBuild](./getting-started) — Set up your first project
- [Task Reference](./task-reference) — All available tasks and their dependencies
- [Configuration Reference](./configuration) — `$PSBPreference` settings
- [Real-World Example](./real-world-example) — Complete project walkthrough
- [psake GitHub](https://github.com/psake/psake) — psake source and issues
- [PowerShellBuild GitHub](https://github.com/psake/PowerShellBuild) — PowerShellBuild source
