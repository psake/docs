---
title: "Getting Started with PowerShellBuild"
description: "Step-by-step guide to adding PowerShellBuild to a PowerShell module project and running your first build."
---

# Getting Started with PowerShellBuild

This guide walks through adding PowerShellBuild to a PowerShell module project from scratch. By the end you will have a working build pipeline that cleans, stages, analyzes, tests, and packages your module.

## Prerequisites

- PowerShell 5.1 or PowerShell 7+
- psake >= 4.9.0
- PowerShellBuild >= 0.7.0

Install both modules from the PowerShell Gallery:

```powershell
Install-Module -Name psake -Repository PSGallery
Install-Module -Name PowerShellBuild -Repository PSGallery
```

## Expected Directory Structure

PowerShellBuild expects a conventional PowerShell module layout. The defaults work with the following structure (all paths are configurable — see [Configuration](./configuration)):

```
MyModule/
├── src/
│   ├── MyModule.psd1          # Module manifest
│   ├── MyModule.psm1          # Root module file
│   ├── Public/                # Exported functions
│   │   └── Get-Thing.ps1
│   └── Private/               # Internal functions
│       └── Invoke-Helper.ps1
├── tests/
│   └── MyModule.Tests.ps1     # Pester tests
├── docs/                      # PlatyPS markdown (generated)
├── build/                     # Output directory (generated)
├── psakeFile.ps1              # Your build task file
├── build.ps1                  # Build bootstrap script
└── requirements.psd1          # Module dependencies
```

## Minimal Setup

### 1. Create `psakeFile.ps1`

The simplest possible build file just references the `Build` task from PowerShellBuild:

```powershell title="psakeFile.ps1"
properties {
    $PSBPreference.Build.OutDir = "$PSScriptRoot/build"
    $PSBPreference.General.SrcRootDir = "$PSScriptRoot/src"
}

task default -depends Build

task Build -FromModule PowerShellBuild -Version '0.7.1'
```

That is all you need. When psake runs the `Build` task, it loads it from the PowerShellBuild module and automatically runs the full dependency chain:

```
Init → Clean → StageFiles → GenerateMarkdown → GenerateMAML → BuildHelp → Build
```

### 2. Create `build.ps1`

A bootstrap script that installs dependencies and invokes psake:

```powershell title="build.ps1"
[CmdletBinding()]
param(
    [string[]]$Task = 'default',
    [switch]$Bootstrap
)

if ($Bootstrap) {
    Get-PackageProvider -Name NuGet -ForceBootstrap | Out-Null
    Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
    Install-Module -Name psake, PowerShellBuild -Scope CurrentUser -Force
}

Import-Module psake
Invoke-psake -buildFile "$PSScriptRoot/psakeFile.ps1" -taskList $Task -nologo

exit ([int](-not $psake.build_success))
```

### 3. Run the Build

```powershell
# First-time setup
.\build.ps1 -Bootstrap

# Build the module
.\build.ps1

# Run tests only
.\build.ps1 -Task Test

# Publish to PSGallery
.\build.ps1 -Task Publish
```

## What Each Task Does

When you run `.\build.ps1` (which runs the `default` task → `Build`), here is what happens:

| Step | Task | What it does |
|------|------|-------------|
| 1 | `Init` | Calls `Initialize-PSBuild` to set up build variables |
| 2 | `Clean` | Removes the output directory |
| 3 | `StageFiles` | Copies (or compiles) module source into the output directory |
| 4 | `GenerateMarkdown` | Generates PlatyPS markdown from module help comments |
| 5 | `GenerateMAML` | Converts PlatyPS markdown to MAML help XML |
| 6 | `BuildHelp` | Meta-task — signals that help generation is complete |
| 7 | `Build` | Meta-task — signals that the build is complete |

Running `.\build.ps1 -Task Test` additionally runs:

| Step | Task | What it does |
|------|------|-------------|
| 8 | `Analyze` | Runs PSScriptAnalyzer against the staged module |
| 9 | `Pester` | Runs Pester tests, optionally with code coverage |
| 10 | `Test` | Meta-task — signals that all tests passed |

## Using with Invoke-Build

If you prefer Invoke-Build over psake, PowerShellBuild supports it via a dot-sourced task file:

```powershell title=".build.ps1"
Import-Module PowerShellBuild

# Dot-source the Invoke-Build task definitions
. PowerShellBuild.IB.Tasks

# Override preferences after import
$PSBPreference.Build.OutDir = "$PSScriptRoot/build"
$PSBPreference.General.SrcRootDir = "$PSScriptRoot/src"
$PSBPreference.Test.ScriptAnalysis.Enabled = $true
```

Run it with:

```powershell
Invoke-Build Build
Invoke-Build Test
```

## Next Steps

- [Task Reference](./task-reference) — Full list of tasks and their dependencies
- [Configuration](./configuration) — Customize `$PSBPreference` to fit your project
- [Real-World Example](./real-world-example) — A complete project with CI/CD integration
