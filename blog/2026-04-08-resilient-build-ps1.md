---
title: "Building a Resilient build.ps1 for psake Projects"
description: "Extend your psake build.ps1 with clear error handling, dynamic tab completion, CI-safe module imports, and more."
date: 2026-04-08T18:00:00.000Z
slug: resilient-build-ps1
authors:
  - tablackburn
tags:
  - psake
  - powershell
  - build-automation
  - ci-cd
  - best-practices
keywords:
  - psake
  - build.ps1
  - PowerShell
  - build automation
  - CI/CD
image: /img/social-card.png
draft: false
fmContentType: blog
title_meta: "Building a Resilient build.ps1"
---

In psake projects, a `build.ps1` is the conventional entry point script that wires everything together. It installs dependencies, configures the environment, and hands off to psake to run your actual build tasks. Think of it as the bootstrapper that gets a fresh machine — or a CI agent — from zero to a working build in a single command: `.\build.ps1`.

psake itself doesn't ship a `build.ps1` — it's a best practice that most projects adopt. You can see a good [example in the psake repo itself](https://github.com/psake/psake/blob/main/build.ps1), which covers the basics: bootstrap installation, help output, build environment detection, and proper CI exit codes. But once you're running concurrent CI jobs, managing internal package feeds, or onboarding new contributors, a few gaps start to show. Here are five patterns that harden your entry point for the real world.

<!-- truncate -->

## Clear Error Handling

The default script silently fails with cryptic "term not recognized" errors when dependencies aren't installed. A simple guard clause makes the fix obvious:

```powershell
if (-not (Get-Module -Name 'PSDepend' -ListAvailable)) {
    throw 'Missing dependencies. Please run with the "-Bootstrap" flag to install dependencies.'
}
```

Instead of hunting through stack traces, new contributors get a one-line message telling them exactly what to do.

## Dynamic Tab Completion

Hardcoded `[ValidateSet()]` values require manual updates every time you add a task. Replace them with `[ArgumentCompleter]` for live discovery:

```powershell
[ArgumentCompleter( {
        param($Command, $Parameter, $WordToComplete, $CommandAst, $FakeBoundParams)
        try {
            Get-PSakeScriptTasks -BuildFile './build.psake.ps1' -ErrorAction 'Stop' |
            Where-Object { $_.Name -like "$WordToComplete*" } |
            Select-Object -ExpandProperty 'Name'
        }
        catch {
            @()
        }
    })]
[string[]]$Task = 'default',
```

Now tab completion always reflects the actual tasks in your psake file — no maintenance required.

## Try-Import-First Pattern

When parallel CI jobs share a module cache, `Install-Module` can hit file locks and fail. The fix: try importing existing modules first, and only install if the import fails.

```powershell
$importSucceeded = $false
try {
    Invoke-PSDepend @psDependParameters
    $importSucceeded = $true
    Write-Verbose 'Successfully imported existing modules.' -Verbose
}
catch {
    Write-Verbose "Could not import all required modules: $_" -Verbose
    Write-Verbose 'Attempting to install missing or outdated dependencies...' -Verbose
}

if (-not $importSucceeded) {
    try {
        Invoke-PSDepend @psDependParameters -Install
    }
    catch {
        Write-Error "Failed to install and import required dependencies: $_"
        throw
    }
}
```

This eliminates a common source of flaky builds in enterprise CI pipelines.

## Internal Repository Support

Organizations often host modules on internal NuGet feeds (ProGet, Azure Artifacts, etc.). Idempotent registration keeps the script portable:

```powershell
$repositoryName = 'internal-nuget-repo'
if (-not (Get-PSRepository -Name $repositoryName -ErrorAction 'SilentlyContinue')) {
    Register-PSRepository @registerPSRepositorySplat
}
```

Pair this with TLS protocol patching to ensure compatibility with modern security requirements:

```powershell
[System.Net.ServicePointManager]::SecurityProtocol = (
    [System.Net.ServicePointManager]::SecurityProtocol -bor
    [System.Net.SecurityProtocolType]::Tls12 -bor
    [System.Net.SecurityProtocolType]::Tls13
)
```

## PowerShellGet Version Pinning

PowerShellGet v3 introduces breaking API changes. Pinning to v2.x keeps behavior predictable:

```powershell
$powerShellGetModuleParameters = @{
    Name           = 'PowerShellGet'
    MinimumVersion = '2.0.0'
    MaximumVersion = '2.99.99'
    Force          = $true
}

if (-not $powerShellGetModule) {
    Install-Module @powerShellGetModuleParameters -Scope 'CurrentUser' -AllowClobber
}
Import-Module @powerShellGetModuleParameters
```

This prevents surprise breakage when a CI agent picks up a new PowerShellGet version.

## Get the Complete Script

These five patterns combine into a production-ready 143-line bootstrap that handles concurrent CI pipelines, enterprise package management, and mixed OS environments. For the full walkthrough and complete script, check out the [original post on my blog](https://tablackburn.github.io/p/resilient-build-ps1/).
