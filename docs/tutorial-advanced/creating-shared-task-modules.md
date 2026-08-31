---
title: "Creating Shared Task Modules"
description: "Create, version, test, and consume reusable psake tasks distributed in a PowerShell module."
---

# Creating Shared Task Modules

A shared task module distributes reusable psake tasks to multiple projects. The provider is a normal PowerShell module with one additional convention: a file named `psakeFile.ps1` at the module root.

Use [`Include`](../best-practices/organizing-large-scripts.md) to split tasks within one repository. Use a shared task module when independently versioned tasks must be installed and reused across repositories.

This guide builds `Example.BuildTasks` version `1.0.0`. Its public task, `Example.Prepare`, cleans and recreates a consumer project's `build` directory.

## Prerequisites

- PowerShell 5.1 or PowerShell 7
- psake 5.x
- Pester 5.x for the optional integration test

Shared task modules were introduced in psake 4.8.0. This example targets the current psake 5.x line and declares that dependency explicitly.

## How shared tasks are loaded

A consumer references a task with `Task -FromModule`:

```powershell
Task 'Example.Prepare' -FromModule 'Example.BuildTasks' -RequiredVersion '1.0.0'
```

When psake reads that declaration, it:

1. Finds a loaded or discoverable module matching the name and version constraint.
2. Dot-sources `<ModuleBase>/psakeFile.ps1` once in the current build context.
3. Registers every task declared by that file alongside the consumer's local tasks.
4. Executes only the requested task graph when the build runs.

`-FromModule` does not import the module's `.psm1`. For deterministic loading, the provider task file should import the exact module manifest before declaring task actions that call its functions.

Provider and consumer task names share one case-insensitive namespace. psake does not provide private tasks or namespace isolation, so treat task names as public API and use a provider-specific prefix.

## Create the tutorial workspace

Create separate module and consumer directories. Add the tutorial's module directory to `PSModulePath` for the current PowerShell session:

```powershell
$tutorialRoot = Join-Path $PWD 'shared-task-tutorial'
$moduleRoot = Join-Path $tutorialRoot 'modules/Example.BuildTasks/1.0.0'
$consumerRoot = Join-Path $tutorialRoot 'consumer'

New-Item -ItemType Directory -Path $moduleRoot, $consumerRoot -Force | Out-Null

$previousModulePath = $env:PSModulePath
$tutorialModulePath = Join-Path $tutorialRoot 'modules'
$env:PSModulePath = $tutorialModulePath + [IO.Path]::PathSeparator + $previousModulePath
```

The versioned directory allows PowerShell to discover multiple installed versions and makes `-RequiredVersion` meaningful.

## Create the provider module

### 1. Create the manifest and root module

Generate a manifest that declares the psake dependency:

```powershell
$manifestPath = Join-Path $moduleRoot 'Example.BuildTasks.psd1'

New-ModuleManifest `
    -Path $manifestPath `
    -RootModule 'Example.BuildTasks.psm1' `
    -ModuleVersion '1.0.0' `
    -PowerShellVersion '5.1' `
    -RequiredModules @{ ModuleName = 'psake'; ModuleVersion = '5.0.0' } `
    -FunctionsToExport @() `
    -CmdletsToExport @() `
    -VariablesToExport @() `
    -AliasesToExport @()

New-Item `
    -ItemType File `
    -Path (Join-Path $moduleRoot 'Example.BuildTasks.psm1') `
    -Force | Out-Null
```

The provider is discoverable as a normal PowerShell module. The shared-task integration itself is defined by the root-level `psakeFile.ps1`, not by a special manifest key.

### 2. Define the shared tasks

Create `Example.BuildTasks/1.0.0/psakeFile.ps1`:

```powershell title="psakeFile.ps1"
Task 'Example.Clean' {
    $outputDirectory = Join-Path $psake.build_script_dir 'build'

    if (Test-Path -LiteralPath $outputDirectory) {
        Remove-Item -LiteralPath $outputDirectory -Recurse -Force
    }
}

Task 'Example.Prepare' -Depends 'Example.Clean' {
    $outputDirectory = Join-Path $psake.build_script_dir 'build'
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}
```

`Example.Prepare` is the public task consumers should reference. `Example.Clean` is a supporting task, but that distinction is only a convention: consumers can invoke any registered provider task directly.

Use `$psake.build_script_dir` for paths owned by the consumer project. In a provider task file, `$PSScriptRoot` points to the installed provider module instead.

Do not define a `default` task in the provider. The consumer owns its default build entry point, and duplicate task names fail when psake registers the shared file.

## Create the consumer build

Create `consumer/psakeFile.ps1`:

```powershell title="consumer/psakeFile.ps1"
Task default -Depends 'Example.Prepare'

Task 'Example.Prepare' `
    -FromModule 'Example.BuildTasks' `
    -RequiredVersion '1.0.0'
```

A shared task reference has no action. The provider supplies the action and dependency graph.

Run the consumer build:

```powershell
$consumerBuild = Join-Path $consumerRoot 'psakeFile.ps1'

Import-Module psake -MinimumVersion '5.0.0'
Invoke-psake -BuildFile $consumerBuild -TaskList default -NoLogo

Test-Path (Join-Path $consumerRoot 'build')
```

The final command returns `True`. `Example.Clean` runs first, followed by `Example.Prepare`.

## Move behavior into module functions

Inline actions are useful for seeing the loading mechanism. As behavior grows, keep orchestration in `psakeFile.ps1` and move implementation into module functions.

Replace `Example.BuildTasks.psm1` with:

```powershell title="Example.BuildTasks.psm1"
function Remove-ExampleBuildOutput {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

function New-ExampleBuildOutput {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

Export-ModuleMember -Function Remove-ExampleBuildOutput, New-ExampleBuildOutput
```

Update `FunctionsToExport` in `Example.BuildTasks.psd1`:

```powershell
FunctionsToExport = @(
    'Remove-ExampleBuildOutput'
    'New-ExampleBuildOutput'
)
```

Then replace the provider's `psakeFile.ps1` with:

```powershell title="psakeFile.ps1"
$manifestPath = Join-Path $PSScriptRoot 'Example.BuildTasks.psd1'
Import-Module -Name $manifestPath -ErrorAction Stop

Task 'Example.Clean' {
    $outputDirectory = Join-Path $psake.build_script_dir 'build'
    Remove-ExampleBuildOutput -Path $outputDirectory
}

Task 'Example.Prepare' -Depends 'Example.Clean' {
    $outputDirectory = Join-Path $psake.build_script_dir 'build'
    New-ExampleBuildOutput -Path $outputDirectory
}
```

Here `$PSScriptRoot` is intentionally provider-relative: it identifies the manifest beside the provider task file. Importing that exact path ensures the task actions use functions from the same physical module version psake selected.

## Final layout

```text
shared-task-tutorial/
├── modules/
│   └── Example.BuildTasks/
│       └── 1.0.0/
│           ├── Example.BuildTasks.psd1
│           ├── Example.BuildTasks.psm1
│           └── psakeFile.ps1
├── consumer/
│   ├── build/                    # Created by Example.Prepare
│   └── psakeFile.ps1
└── SharedTaskModule.Tests.ps1
```

A published package must include all three provider files at the module root.

## Version selection and reference overrides

Use the version parameter that matches the consumer's compatibility policy:

```powershell
Task 'Example.Prepare' -FromModule 'Example.BuildTasks' -RequiredVersion '1.0.0'
Task 'Example.Prepare' -FromModule 'Example.BuildTasks' -MinimumVersion '1.0.0'
Task 'Example.Prepare' -FromModule 'Example.BuildTasks' -MaximumVersion '1.9.0'
Task 'Example.Prepare' -FromModule 'Example.BuildTasks' -LessThanVersion '2.0.0'
```

These are alternatives, not declarations to place together. `-Version` is an alias for `-RequiredVersion`. If a same-named module is already loaded, psake uses it only when it satisfies the constraints; otherwise the reference fails. When none is loaded, psake selects the highest discoverable version that satisfies all supplied constraints.

A consumer can replace a provider task's dependencies, but `-Depends` replaces the provider list rather than appending to it:

```powershell
Task 'Example.Prepare' `
    -FromModule 'Example.BuildTasks' `
    -RequiredVersion '1.0.0' `
    -Depends 'Consumer.Prerequisite'
```

This reference no longer depends on `Example.Clean`. Use overrides deliberately and review them whenever the provider's task graph changes. See the [`Task` command reference](../commands/Task.mdx) for the complete shared-task parameter set.

## Test the consumer contract

Provider function tests do not prove module discovery, task registration, or dependency execution. Save `SharedTaskModule.Tests.ps1` at the tutorial root, then invoke the separate consumer build and check the observable result:

```powershell title="SharedTaskModule.Tests.ps1"
Describe 'Example.BuildTasks consumer contract' {
    BeforeAll {
        Import-Module psake -MinimumVersion '5.0.0'
        $consumerRoot = Join-Path $PSScriptRoot 'consumer'
        $consumerBuild = Join-Path $consumerRoot 'psakeFile.ps1'
        $outputDirectory = Join-Path $consumerRoot 'build'
    }

    BeforeEach {
        New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $outputDirectory 'stale.txt') -Value 'stale'
    }

    It 'cleans and prepares the build directory' {
        $result = Invoke-psake -BuildFile $consumerBuild -TaskList default -NoLogo

        $result.Success | Should -BeTrue
        $outputDirectory | Should -Exist
        (Join-Path $outputDirectory 'stale.txt') | Should -Not -Exist
    }
}
```

Run the test in a process where the provider's module root is on `PSModulePath`.

## Production guidelines

- **Keep file-scope work declarative.** Loading `psakeFile.ps1` executes its top-level statements in the consumer's build process. Restrict file scope to loading dependencies and declaring properties or tasks. Put filesystem changes, network access, and environment mutation inside task actions.
- **Trust the provider.** Installing and referencing a shared task module authorizes its task file to execute code while the build is loaded. Pin and review provider versions as you would other build dependencies.
- **Avoid collisions.** Prefix public and supporting task names. Do not define `default` in a provider module.
- **Version task contracts.** Removing or renaming a public task, changing required inputs, or incompatibly changing behavior requires a breaking module version. Internal graph changes are compatible only when the public result remains compatible.
- **Test through a consumer.** Exercise module discovery and the public task graph, not only implementation functions.
- **Keep consumer configuration explicit.** Provider `Properties` blocks share the consumer context and have ordering implications. Document every supported property as part of the module contract.

For local packaging tests, publish to a file-based PowerShell repository before publishing the same artifact to the PowerShell Gallery. See Microsoft's documentation for [`New-ModuleManifest`](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/new-modulemanifest), [installing modules on `PSModulePath`](https://learn.microsoft.com/powershell/scripting/developer/module/installing-a-powershell-module), and [`Publish-Module`](https://learn.microsoft.com/powershell/module/powershellget/publish-module).

Restore the original module search path when you finish the tutorial:

```powershell
$env:PSModulePath = $previousModulePath
```

## See also

- [Organizing Large Build Scripts](../best-practices/organizing-large-scripts.md) — Share task files within one repository with `Include`
- [`Task` command reference](../commands/Task.mdx) — Complete `-FromModule` and version-constraint syntax
- [Introduction to PowerShellBuild](../powershellbuild/introduction.md) — A production shared task module for PowerShell projects
- [PowerShell module manifests](https://learn.microsoft.com/powershell/scripting/developer/module/how-to-write-a-powershell-module-manifest)
