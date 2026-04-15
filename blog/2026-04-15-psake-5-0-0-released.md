---
title: "psake 5.0.0 Is Here: Declarative Tasks, Caching, and Structured Output"
description: "psake 5.0.0 is a major leap forward for PowerShell build automation—bringing declarative task syntax, compile-time validation, file-based caching, structured output, and CI-native integrations."
date: 2026-04-15T12:00:00.000Z
slug: psake-5-0-0-released
authors:
  - heyitsgilbert
tags:
  - release
  - announcement
  - psake
  - powershell
  - build-automation
  - ci-cd
keywords:
  - psake
  - psake 5.0
  - PowerShell build automation
  - declarative tasks
  - task caching
  - structured output
  - GitHub Actions
  - build system
image: /img/social-card.png
draft: false
fmContentType: blog
title_meta: "psake 5.0.0 Released"
---

After years of steady iteration on the v4 line, we're thrilled to announce the release of **psake 5.0.0**—the biggest update to the PowerShell build automation framework since its inception. This release introduces a declarative task syntax, two-phase compilation, local file-based caching, structured output, and first-class CI integration. Here's everything that's new.

<!-- truncate -->

## Declarative Task Syntax

The flagship feature of psake 5 is a new hashtable-based syntax for defining tasks. Rather than relying on positional parameters, you can now describe tasks as structured data with named, validated keys:

```powershell
Task 'Build' @{
    DependsOn = 'Clean'
    Action    = { dotnet build -c $Configuration }
}
```

Every key is validated at compile time—typos like `DependsOnn` or `Acton` are caught before a single task runs. The original parameter-based syntax still works, so your existing build scripts don't need to change.

## Two-Phase Compilation

psake 5 separates build file loading from task execution. When you call `Invoke-psake`, the dependency graph is built first via a topological sort, and circular dependencies are caught at **compile time** rather than halfway through a run. This means faster, clearer feedback—and no more builds that silently fail mid-execution.

You can also use the new `-CompileOnly` parameter to inspect the build plan without running anything:

```powershell
Invoke-psake -CompileOnly
```

This is especially useful in code review and CI pre-flight checks.

## Local File-Based Caching

For tasks that process files—compilation, transpilation, packaging—psake 5 introduces content-addressed caching. Declare `Inputs` and `Outputs` on a task, and psake will SHA256-hash the inputs to determine whether the task actually needs to run:

```powershell
Task 'Build' @{
    Inputs  = 'src/**/*.cs', 'src/**/*.csproj'
    Outputs = 'bin/**/*.dll'
    Action  = { dotnet build -c $Configuration }
}
```

Cache state is stored in `.psake/cache/`. If nothing changed, the task is skipped and the build report marks it as **Cached**. To bypass caching for a single run, pass `-NoCache`:

```powershell
Invoke-psake -NoCache
```

And to clear the cache entirely, use the new `Clear-PsakeCache` function.

## Structured Build Results

`Invoke-psake` now returns a `PsakeBuildResult` object containing per-task metrics, success status, duration, and error information. Scripting against build output no longer requires parsing console text:

```powershell
$result = Invoke-psake
$result.Tasks | Where-Object Cached | Select-Object Name, Duration
```

The `$psake.build_success` variable is still set after every run, so existing CI scripts that check build status continue to work without modification.

## CI-Native Output Formats

Building for GitHub Actions? Pass `-OutputFormat GitHubActions` and psake will emit workflow annotations—warnings and errors that surface directly in pull request diffs. For pipelines that consume build data programmatically, `-OutputFormat JSON` outputs the full `PsakeBuildResult` as structured JSON.

The output format can also be set via the `PSAKE_OUTPUT_FORMAT` environment variable, making it easy to configure in CI without changing your build scripts.

## Quiet Mode

The new `-Quiet` parameter suppresses all console output while still returning the full `PsakeBuildResult` object—including complete error records for any failed tasks. No output is swallowed; it's simply not printed.

This is particularly valuable when psake is invoked by an LLM agent or AI coding tool. Console build logs are noisy: progress messages, separator lines, and timing output all burn through context that the model could spend on the actual problem. With `-Quiet`, the agent gets silence on stdout and a precise, structured result it can inspect programmatically:

```powershell
$result = Invoke-psake -Quiet
if (-not $result.Success) {
    # Full error records are available—no log scraping needed
    $result.Tasks | Where-Object { $_.Error } | ForEach-Object {
        Write-Host "Task '$($_.Name)' failed: $($_.Error.Message)"
    }
}
```

Rather than parsing wall-of-text build output, the agent can check `$result.Success`, iterate `$result.Tasks`, and read `$_.Error` directly—structured data that maps cleanly to a tool call response. Pair this with `-OutputFormat JSON` if you need to pass the result across a process boundary or into a prompt.

## New Testing APIs

Two new functions let you inspect and test your build scripts without running a full build:

- **`Get-PsakeBuildPlan`** — Returns the full execution plan for a build file without running it. Inspect task order, dependencies, and caching configuration in tests.
- **`Test-PsakeTask`** — Executes a single named task with custom variable overrides. Great for unit-testing individual task logic in isolation.

## Version Declaration

Build files can now declare the minimum psake major version they require:

```powershell
Version 5
```

If someone runs your build script on an older psake installation, they get a clear error instead of a confusing failure deep inside a task.

## Hashtable Properties

The `Properties` block gains a more concise hashtable syntax alongside the original scriptblock form:

```powershell
Properties @{
    Configuration = 'Release'
    OutputDir     = './artifacts'
}
```

Both styles are supported and can be mixed within the same build file.

## `NO_COLOR` Support

psake 5 respects the `$env:NO_COLOR` convention for suppressing colored output. Set it in environments where ANSI escape codes cause issues—terminals without color support, log aggregators, or accessibility tools.

## Breaking Changes

psake 5 is a major version, and it includes a few breaking changes. Most build scripts will work without modification, but there are three things to check:

1. **Rename `default.ps1` to `psakefile.ps1`** — The `default.ps1` fallback file name is no longer auto-detected.
2. **Replace the wrapper scripts** — `psake.ps1` and `psake.cmd` are removed. Use `Import-Module psake; Invoke-psake` instead.
3. **Update Framework calls** — .NET Framework versions below 4.0 are no longer supported, and the default is now 4.7.2. The `$framework` global variable is removed; use `Framework '4.7.2'` instead.

Additionally, the minimum required PowerShell version is now **5.1** (raised from 3.0), and the output handler configuration properties have been removed in favor of the new `-OutputFormat` and `-Quiet` parameters.

Full details are in the [migration guide](https://github.com/psake/psake/blob/master/docs/migration-v4-to-v5.md).

## Upgrading

```powershell
# Install from the PowerShell Gallery
Install-Module -Name psake -MinimumVersion 5.0.0 -Force

# Verify the version
Get-Module psake -ListAvailable | Select-Object Version
```

Then run your existing build to check for any breaking changes. For most projects, it'll just work.

---

psake 5 is the result of years of community feedback, and we're excited to see what you build with it. If you run into anything unexpected, [open an issue](https://github.com/psake/psake/issues). And if you're using the new features in interesting ways, we'd love to hear about it.
