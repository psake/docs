---
title: "Configuration Reference"
description: "Complete reference for all psake configuration options, parameters, and build script settings"
---

# Configuration Reference

Complete reference for all psake configuration options, build script settings, and the `$psake` context object.

## Invoke-psake Parameters

### Core Parameters

#### -buildFile

**Type:** `string`
**Default:** `psakefile.ps1` or `default.ps1`
**Description:** Path to the psake build script to execute.

```powershell
# Use default build file (psakefile.ps1)
Invoke-psake

# Use custom build file
Invoke-psake -buildFile ./build/custom-build.ps1

# Use absolute path
Invoke-psake -buildFile C:\projects\myapp\build.ps1
```

**Search order for default build files:**
1. `psakefile.ps1`
2. `default.ps1`

#### -taskList

**Type:** `string[]`
**Default:** `@('Default')`
**Description:** Array of task names to execute. Tasks run in the order specified.

```powershell
# Run single task
Invoke-psake -taskList Build

# Run multiple tasks in order
Invoke-psake -taskList Clean, Build, Test

# Run default task (equivalent to omitting parameter)
Invoke-psake -taskList Default
```

**Notes:**
- Task dependencies are resolved automatically
- Each task runs at most once per invocation
- Circular dependencies cause build failure

#### -framework

**Type:** `string`
**Default:** `$null`
**Description:** .NET Framework version to target. Primarily for legacy compatibility.

```powershell
# Target .NET Framework 4.8
Invoke-psake -framework '4.8'

# Target .NET Framework 4.0
Invoke-psake -framework '4.0'

# Target .NET 6.0
Invoke-psake -framework 'net6.0'
```

**Common values:**
- `'3.5'` - .NET Framework 3.5
- `'4.0'` - .NET Framework 4.0
- `'4.5'` - .NET Framework 4.5
- `'4.8'` - .NET Framework 4.8
- `'net6.0'`, `'net7.0'`, `'net8.0'` - Modern .NET

**Note:** Most modern builds handle framework targeting via project files rather than psake.

#### -docs

**Type:** `switch`
**Default:** `$false`
**Description:** Display task documentation without executing tasks.

```powershell
# Show all tasks with descriptions
Invoke-psake -docs

# Output:
# Task Name    Description
# ---------    -----------
# Build        Compiles the solution
# Test         Runs unit tests
# Deploy       Deploys to production
```

**Related:** Use `-detaileddocs` for more information including dependencies.

#### -detailedDocs

**Type:** `switch`
**Default:** `$false`
**Description:** Display detailed task documentation including dependencies.

```powershell
# Show detailed task information
Invoke-psake -detailedDocs

# Output includes:
# - Task names
# - Descriptions
# - Dependencies
# - Preconditions
# - Postconditions
```

#### -parameters

**Type:** `hashtable`
**Default:** `@{}`
**Description:** Hashtable of parameters to pass to the build script. Parameters override property defaults.

```powershell
# Pass single parameter
Invoke-psake -parameters @{ Configuration = 'Release' }

# Pass multiple parameters
Invoke-psake -parameters @{
    Configuration = 'Release'
    Version = '2.0.0'
    Environment = 'Production'
}

# Parameters override properties
# In psakefile.ps1:
Properties {
    $Configuration = 'Debug'  # Default
}

# Invoke with parameter:
Invoke-psake -parameters @{ Configuration = 'Release' }  # Overrides to Release
```

**Best practices:**
- Use for values that change between builds
- Provide sensible defaults in Properties block
- Document required parameters in build script

#### -properties

**Type:** `hashtable`
**Default:** `@{}`
**Description:** Alternative name for `-parameters`. Functionally identical.

```powershell
# These are equivalent:
Invoke-psake -parameters @{ Configuration = 'Release' }
Invoke-psake -properties @{ Configuration = 'Release' }
```

#### -initialization

**Type:** `scriptblock`
**Default:** `$null`
**Description:** Script block to execute before any tasks run. Used for custom initialization logic.

```powershell
Invoke-psake -initialization {
    Write-Host "Initializing build environment..."
    $env:BUILD_START_TIME = Get-Date
    Import-Module CustomBuildHelpers
}
```

**Use cases:**
- Load custom modules
- Set environment variables
- Verify prerequisites
- Initialize logging

#### -nologo

**Type:** `switch`
**Default:** `$false`
**Description:** Suppress the psake logo and version information.

```powershell
# Hide psake logo
Invoke-psake -nologo

# Useful in CI/CD to reduce log noise
```

#### -notr

**Type:** `switch`
**Default:** `$false`
**Description:** Suppress the build time report at the end of execution.

```powershell
# Hide time report
Invoke-psake -notr

# Normal output includes:
# ----------------------------------------------------------------------
# Build Time Report
# ----------------------------------------------------------------------
# Name     Duration
# ----     --------
# Clean    00:00:01.234
# Build    00:00:15.678
# Total:   00:00:16.912
```

## Build Script Configuration

### Properties Block

The `Properties` block defines variables used throughout the build script.

```powershell
Properties {
    # Simple properties
    $Configuration = 'Release'
    $Version = '1.0.0'

    # Computed properties
    $BuildDir = Split-Path $psake.build_script_file
    $OutputPath = Join-Path $BuildDir 'build'

    # Properties from environment
    $ApiKey = $env:API_KEY
    $BuildNumber = $env:BUILD_NUMBER ?? '0'
}
```

**Key characteristics:**
- Can appear multiple times in a script
- Later definitions can reference earlier properties
- Can be overridden via `-parameters`
- Available to all tasks

### Task Definition

Tasks are defined using the `Task` keyword with various optional parameters.

#### Basic Syntax

```powershell
Task TaskName {
    # Task body
}
```

#### Full Syntax

```powershell
Task TaskName `
    -depends DependencyTask1, DependencyTask2 `
    -requiredVariables 'Variable1', 'Variable2' `
    -description "Task description for documentation" `
    -precondition { $Environment -eq 'Production' } `
    -postcondition { Test-Path $OutputFile } `
    -continueOnError `
    -action {
        # Task implementation
    }
```

### Task Parameters

#### -depends

**Type:** `string[]`
**Default:** `@()`
**Description:** Array of task names that must execute before this task.

```powershell
Task Test -depends Build {
    exec { dotnet test }
}

# Multiple dependencies
Task Deploy -depends Clean, Build, Test {
    exec { ./deploy.ps1 }
}
```

**Behavior:**
- Dependencies run in declaration order
- Each dependency runs exactly once
- Transitive dependencies are resolved automatically
- Circular dependencies cause error

#### -requiredVariables

**Type:** `string[]`
**Default:** `@()`
**Description:** Array of property names that must be defined and non-null.

```powershell
Properties {
    $Version = '1.0.0'
    $ApiKey = $env:API_KEY
}

Task Deploy -requiredVariables 'Version', 'ApiKey' {
    # Build fails if Version or ApiKey is null/undefined
    exec { ./deploy.ps1 -Version $Version -ApiKey $ApiKey }
}
```

**Validation:**
- Checked before task execution
- Fails build if any variable is undefined or null
- Provides clear error message

#### -description

**Type:** `string`
**Default:** `''`
**Description:** Human-readable description shown by `-docs` and `-detailedDocs`.

```powershell
Task Build -description "Compiles the solution in Release mode" {
    exec { dotnet build --configuration Release }
}

# View descriptions
Invoke-psake -docs
```

**Best practices:**
- Write clear, concise descriptions
- Describe what the task does, not how
- Include any important prerequisites or side effects

#### -precondition

**Type:** `scriptblock`
**Default:** `$null`
**Description:** Script block that must return `$true` for task to execute. If `$false`, task is skipped.

```powershell
Properties {
    $Environment = 'Development'
}

Task DeployProd -precondition { $Environment -eq 'Production' } {
    exec { ./deploy-production.ps1 }
}

# Task is skipped if precondition returns $false
```

**Use cases:**
- Environment-specific tasks
- Conditional execution based on configuration
- Skip tasks when prerequisites aren't met

**Note:** Skipped tasks don't fail the build.

#### -postcondition

**Type:** `scriptblock`
**Default:** `$null`
**Description:** Script block that must return `$true` after task completes. If `$false`, build fails.

```powershell
Task Build -postcondition { Test-Path './build/app.dll' } {
    exec { dotnet build -o ./build }
}

# Build fails if postcondition returns $false
```

**Use cases:**
- Verify task produced expected output
- Validate build artifacts
- Ensure task side effects occurred

**Note:** Failed postconditions fail the build.

#### -continueOnError

**Type:** `switch`
**Default:** `$false`
**Description:** Continue build execution even if task throws an error.

```powershell
Task OptionalCleanup -continueOnError {
    Remove-Item ./temp -Recurse -Force
    # Build continues even if this fails
}
```

**Use cases:**
- Optional cleanup operations
- Best-effort tasks
- Non-critical operations

**Warning:** Use sparingly. Most tasks should fail the build on error.

#### -action

**Type:** `scriptblock`
**Default:** `$null`
**Description:** The script block containing task logic. Alternative to inline script block.

```powershell
# These are equivalent:

# Inline form
Task Build {
    exec { dotnet build }
}

# Action parameter form
Task Build -action {
    exec { dotnet build }
}
```

### FormatTaskName

Customizes how task names are displayed during execution.

#### Syntax

```powershell
FormatTaskName {
    param($taskName)
    # Return string or use Write-Host
}
```

#### Examples

```powershell
# Simple separator
FormatTaskName {
    param($taskName)
    Write-Host "===== $taskName =====" -ForegroundColor Cyan
}

# Box format
FormatTaskName {
    param($taskName)
    $line = "=" * 70
    Write-Host $line -ForegroundColor Blue
    Write-Host "  TASK: $taskName" -ForegroundColor Yellow
    Write-Host $line -ForegroundColor Blue
}

# With timestamp
FormatTaskName {
    param($taskName)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $taskName" -ForegroundColor Green
}

# Return string (psake will output it)
FormatTaskName {
    param($taskName)
    return ">>> Executing: $taskName <<<"
}
```

### Include

Includes tasks and functions from another PowerShell file.

#### Syntax

```powershell
Include <file-path>
```

#### Examples

```powershell
# Include from relative path
Include ./shared-tasks.ps1
Include ./build/common-tasks.ps1

# Include from computed path
Properties {
    $BuildDir = Split-Path $psake.build_script_file
}

Include (Join-Path $BuildDir 'tasks/deploy-tasks.ps1')

# Include multiple files
Include ./tasks/build-tasks.ps1
Include ./tasks/test-tasks.ps1
Include ./tasks/deploy-tasks.ps1
```

**Behavior:**
- Included files can define tasks, properties, and functions
- Included tasks are available to all tasks in main script
- Include statements are processed before tasks execute
- Relative paths are relative to the build script directory

## The $psake Context Object

The `$psake` variable is automatically available in all build scripts and contains context information.

### $psake Properties

#### $psake.version

**Type:** `string`
**Description:** The version of the psake module.

```powershell
Task Info {
    Write-Host "psake version: $($psake.version)"
}
```

#### $psake.build_script_file

**Type:** `string`
**Description:** Full path to the current build script file.

```powershell
Properties {
    $ScriptPath = $psake.build_script_file
    # Example: C:\projects\myapp\psakefile.ps1
}
```

**Common use:**
```powershell
Properties {
    $BuildDir = Split-Path $psake.build_script_file
    $ProjectRoot = Split-Path $BuildDir
}
```

#### $psake.build_script_dir

**Type:** `string`
**Description:** Directory containing the build script file.

```powershell
Properties {
    $ScriptDir = $psake.build_script_dir
    # Example: C:\projects\myapp
}
```

#### $psake.context

**Type:** `object`
**Description:** Current build execution context, including current task and call stack.

```powershell
Task Debug {
    Write-Host "Current context:"
    $psake.context | Format-List
}
```

**Properties of $psake.context:**
- `currentTaskName` - Name of currently executing task
- `tasks` - Hashtable of all defined tasks
- `properties` - Hashtable of all properties
- `success` - Boolean indicating build success/failure

#### $psake.build_success

**Type:** `boolean`
**Description:** Indicates whether the build has succeeded so far.

```powershell
Task Cleanup {
    if ($psake.build_success) {
        Write-Host "Build succeeded, cleaning up..."
    } else {
        Write-Host "Build failed, preserving artifacts for debugging"
    }
}
```

## Exec Function

The `exec` function executes external commands and automatically handles errors.

### Syntax

```powershell
exec {
    # Script block to execute
} [-errorMessage <string>] [-maxRetries <int>] [-retryTriggerErrorPattern <string>] [-continueOnError]
```

### Parameters

#### Script Block (Required)

The command(s) to execute.

```powershell
exec { dotnet build }
exec { msbuild MySolution.sln /p:Configuration=Release }
exec { npm run build }
```

#### -errorMessage

Custom error message if command fails.

```powershell
exec { dotnet build } -errorMessage "Build failed with errors"
```

#### -maxRetries

Number of times to retry on failure.

```powershell
# Retry up to 3 times
exec { ./deploy.ps1 } -maxRetries 3
```

#### -retryTriggerErrorPattern

Regular expression pattern. Only retry if error message matches pattern.

```powershell
exec { ./deploy.ps1 } `
    -maxRetries 3 `
    -retryTriggerErrorPattern "timeout|connection"
```

#### -continueOnError

Don't fail build if command fails.

```powershell
exec { dotnet test } -continueOnError
```

### Examples

```powershell
# Basic usage
Task Build {
    exec { dotnet build }
}

# With error message
Task Build {
    exec { dotnet build } -errorMessage "Failed to compile solution"
}

# With retries
Task Deploy {
    exec { ./deploy.ps1 } -maxRetries 3
}

# Conditional retry
Task Deploy {
    exec { ./deploy.ps1 } `
        -maxRetries 5 `
        -retryTriggerErrorPattern "timeout|429|503"
}

# Multiple commands
Task Build {
    exec { dotnet restore }
    exec { dotnet build --no-restore }
    exec { dotnet test --no-build }
}
```

## Assert Function

The `assert` function validates conditions and fails the build if condition is false.

### Syntax

```powershell
Assert <condition> <error-message>
```

### Parameters

#### Condition (Required)

Boolean expression that must be true.

#### Error Message (Required)

Message to display if assertion fails.

### Examples

```powershell
# File existence
Task Validate {
    Assert (Test-Path './src') "Source directory not found"
    Assert (Test-Path './config.json') "Configuration file missing"
}

# Variable validation
Task Deploy {
    Assert (![string]::IsNullOrEmpty($ApiKey)) "API_KEY is required"
    Assert ($Version -match '^\d+\.\d+\.\d+$') "Invalid version format: $Version"
}

# Condition checks
Task DeployProd {
    Assert ($Environment -eq 'Production') "This task only runs in Production environment"
    Assert (Test-Path $ArtifactPath) "Build artifacts not found at: $ArtifactPath"
}

# Multiple assertions
Task Validate {
    Assert ($Configuration -in @('Debug', 'Release')) "Configuration must be Debug or Release"
    Assert ($PSVersionTable.PSVersion.Major -ge 7) "PowerShell 7+ is required"
    Assert (Get-Command dotnet -ErrorAction SilentlyContinue) "dotnet CLI not found in PATH"
}
```

## Environment Variables

Common environment variables used with psake builds.

### CI/CD Environment Variables

```powershell
Properties {
    # Common CI indicators
    $IsCI = $env:CI -eq 'true'
    $IsCIServer = $env:TF_BUILD -eq 'True' -or $env:GITHUB_ACTIONS -eq 'true'

    # Build number
    $BuildNumber = $env:BUILD_NUMBER ??
                   $env:BUILD_BUILDNUMBER ??
                   $env:GITHUB_RUN_NUMBER ??
                   '0'

    # Branch name
    $Branch = $env:GIT_BRANCH ??
              $env:BUILD_SOURCEBRANCHNAME ??
              $env:GITHUB_REF_NAME ??
              'main'

    # Commit SHA
    $CommitSha = $env:GIT_COMMIT ??
                 $env:BUILD_SOURCEVERSION ??
                 $env:GITHUB_SHA ??
                 'unknown'
}
```

### Common Custom Environment Variables

```powershell
Properties {
    # Configuration
    $Configuration = $env:BUILD_CONFIGURATION ?? 'Debug'
    $Environment = $env:DEPLOY_ENVIRONMENT ?? 'Development'

    # Versioning
    $Version = $env:VERSION ?? '1.0.0'

    # Secrets (never hardcode!)
    $ApiKey = $env:API_KEY
    $NuGetApiKey = $env:NUGET_API_KEY
    $AwsAccessKey = $env:AWS_ACCESS_KEY_ID
    $AwsSecretKey = $env:AWS_SECRET_ACCESS_KEY

    # Paths
    $ArtifactPath = $env:ARTIFACT_PATH ?? './artifacts'
    $OutputPath = $env:OUTPUT_PATH ?? './build'
}
```

## PowerShell Version Considerations

psake works with multiple PowerShell versions. Consider compatibility:

```powershell
Properties {
    $PSVersion = $PSVersionTable.PSVersion.Major

    # Use null-coalescing only in PS 7+
    if ($PSVersion -ge 7) {
        $Configuration = $env:BUILD_CONFIG ?? 'Debug'
    } else {
        $Configuration = if ($env:BUILD_CONFIG) { $env:BUILD_CONFIG } else { 'Debug' }
    }
}

Task ValidatePowerShell {
    $minVersion = 5
    Assert ($PSVersionTable.PSVersion.Major -ge $minVersion) `
        "PowerShell $minVersion or later is required (current: $($PSVersionTable.PSVersion))"
}
```

## See Also

- [Glossary](/docs/reference/glossary) - Term definitions
- [Cheat Sheet](/docs/reference/cheat-sheet) - Quick reference
- [Exit Codes](/docs/reference/exit-codes) - Exit code meanings
- [Parameters and Properties](/docs/tutorial-basics/parameters-properties) - Parameter handling guide
- [Tasks](/docs/tutorial-basics/tasks) - Task definition guide
