---
title: "Common Errors"
description: "Solutions to the most frequently encountered psake errors including task not found, module loading issues, path resolution, and dependency problems"
---

# Common Errors

This guide covers the most common errors you'll encounter when using psake and provides step-by-step solutions to resolve them.

## Task Not Found Errors

### Error: "Task [TaskName] does not exist"

**Problem:** psake cannot find the task you're trying to execute.

**Common Causes:**
- Typo in the task name
- Task is defined in a different build file
- Task name is case-sensitive in some scenarios

**Solution:**

```powershell
# List all available tasks
Invoke-psake -docs

# Or get detailed task information
Invoke-psake -buildFile .\psakefile.ps1 -docs

# Verify task name spelling (case matters)
Task Build {  # This is "Build"
    # ...
}

# This will fail:
Invoke-psake -taskList build  # Wrong case
```

**Best Practice:**

Always use the exact task name as defined:

```powershell
# Define task
Task CompileApp {
    # Task implementation
}

# Correct invocation
Invoke-psake -taskList CompileApp
```

### Error: "No default task specified"

**Problem:** You didn't specify which task to run and there's no default task defined.

**Solution:**

Define a default task in your psakefile.ps1:

```powershell
# Option 1: Use the Task Default
Task Default -depends Build, Test

# Option 2: Specify the task when invoking
Invoke-psake -taskList Build

# Option 3: Set default in properties
Properties {
    $DefaultTask = 'Build'
}
```

## Module Loading Issues

### Error: "The specified module 'psake' was not loaded"

**Problem:** PowerShell cannot find the psake module.

**Solution:**

```powershell
# Check if psake is installed
Get-Module -ListAvailable psake

# If not installed, install it
Install-Module -Name psake -Scope CurrentUser -Force

# If installed but not loading, import explicitly
Import-Module psake -Force

# Check the module path
$env:PSModulePath -split [System.IO.Path]::PathSeparator
```

### Error: "Assembly with same name is already loaded"

**Problem:** psake module or dependencies are already loaded in the session with different versions.

**Solution:**

```powershell
# Start a fresh PowerShell session
pwsh

# Or force reload in a new scope
& {
    Import-Module psake -Force
    Invoke-psake -buildFile .\psakefile.ps1
}

# For persistent issues, remove and reinstall
Remove-Module psake -Force -ErrorAction SilentlyContinue
Uninstall-Module psake -AllVersions
Install-Module psake -Scope CurrentUser -Force
```

### Error: "Could not load file or assembly"

**Problem:** psake or a dependency has a corrupted installation or version mismatch.

**Solution:**

```powershell
# Reinstall psake cleanly
Uninstall-Module psake -AllVersions -Force
Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\PowerShell\PowerShellGet\NuGetPackages\psake*" -Recurse -Force -ErrorAction SilentlyContinue

# Clear the module cache
Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\PowerShell\ModuleAnalysisCache" -Force -ErrorAction SilentlyContinue

# Install fresh
Install-Module psake -Scope CurrentUser -Force

# Verify installation
Get-Module psake -ListAvailable
```

## Path Resolution Problems

### Error: "Cannot find path" or "Path does not exist"

**Problem:** psake tasks reference files or directories that don't exist or use incorrect path formats.

**Solution:**

```powershell
# Use absolute paths or paths relative to $PSScriptRoot
Properties {
    # Bad: Assumes current directory
    $BuildDir = '.\build'

    # Good: Relative to script location
    $BuildDir = Join-Path $PSScriptRoot 'build'

    # Also good: Use Resolve-Path for existing paths
    $SrcDir = Resolve-Path (Join-Path $PSScriptRoot 'src')
}

Task Build {
    # Verify path exists before using
    if (-not (Test-Path $BuildDir)) {
        New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
    }

    # Use cross-platform path handling
    $outputPath = Join-Path $BuildDir 'output'
}
```

### Error: Cross-Platform Path Issues

**Problem:** Build scripts fail on Linux/macOS due to Windows-style paths.

**Solution:**

```powershell
Properties {
    # Bad: Windows-only backslashes
    $BuildDir = "$PSScriptRoot\build\output"

    # Good: Cross-platform path construction
    $BuildDir = Join-Path $PSScriptRoot 'build' | Join-Path -ChildPath 'output'

    # Or use forward slashes (works on all platforms)
    $BuildDir = "$PSScriptRoot/build/output"

    # Best: Use Path cmdlets
    $BuildDir = [System.IO.Path]::Combine($PSScriptRoot, 'build', 'output')
}

Task Clean {
    # Use platform-agnostic commands
    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
}
```

### Error: "Access to the path is denied"

**Problem:** Insufficient permissions or file locks prevent psake from accessing files.

**Solution:**

```powershell
Task Clean {
    # Handle locked files gracefully
    try {
        if (Test-Path $BuildDir) {
            # Wait and retry if files are locked
            $retries = 3
            $delay = 1

            for ($i = 0; $i -lt $retries; $i++) {
                try {
                    Remove-Item $BuildDir -Recurse -Force -ErrorAction Stop
                    break
                } catch {
                    if ($i -eq ($retries - 1)) { throw }
                    Write-Host "Retrying in $delay seconds..."
                    Start-Sleep -Seconds $delay
                    $delay *= 2
                }
            }
        }
    } catch {
        Write-Warning "Could not remove $BuildDir : $_"
        # Optionally continue or fail
        # throw
    }
}

# Or run with elevated permissions (Windows)
# Start-Process pwsh -Verb RunAs -ArgumentList "-Command Invoke-psake"
```

## PowerShell Version Conflicts

### Error: "Parameter set cannot be resolved"

**Problem:** Using syntax or cmdlets not available in the current PowerShell version.

**Solution:**

```powershell
# Check PowerShell version in your build script
Properties {
    $PSVersion = $PSVersionTable.PSVersion
}

Task Init {
    Write-Host "PowerShell Version: $($PSVersion.ToString())"

    # Require minimum version
    if ($PSVersion.Major -lt 5) {
        throw "This build requires PowerShell 5.0 or higher. Current version: $($PSVersion.ToString())"
    }
}

# Use version-specific code
Task Build {
    if ($PSVersion.Major -ge 7) {
        # PowerShell 7+ features
        $items = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue
    } else {
        # PowerShell 5.x compatible
        $items = Get-ChildItem -Recurse | Where-Object { -not $_.PSIsContainer }
    }
}
```

### Error: "The term 'pwsh' is not recognized"

**Problem:** Trying to use PowerShell 7+ (pwsh) when only Windows PowerShell (powershell) is installed.

**Solution:**

```powershell
# Check which PowerShell is available
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    # PowerShell 7+ is available
    $psExe = 'pwsh'
} else {
    # Fall back to Windows PowerShell
    $psExe = 'powershell'
}

Task RunInNewSession {
    exec { & $psExe -NoProfile -Command "Write-Host 'Running in new session'" }
}
```

### Error: ExecutionPolicy Restrictions (Windows PowerShell)

**Problem:** Script execution is blocked by PowerShell execution policy.

**Solution:**

```powershell
# Check current execution policy
Get-ExecutionPolicy -List

# Set execution policy for current user (doesn't require admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for a single session
powershell -ExecutionPolicy Bypass -File .\build.ps1

# Or use PowerShell 7+ which has a more permissive default
pwsh -File .\build.ps1

# In CI/CD, use pwsh which doesn't have this restriction
# GitHub Actions example:
# - shell: pwsh
#   run: Invoke-psake
```

## Dependency Cycle Errors

### Error: "Circular dependency detected"

**Problem:** Tasks depend on each other in a circular manner.

**Solution:**

```powershell
# Bad: Circular dependency
Task A -depends B {
    # Task A implementation
}

Task B -depends A {  # Error: B depends on A, which depends on B
    # Task B implementation
}

# Good: Restructure dependencies
Task A -depends Common {
    # Task A specific code
}

Task B -depends Common {
    # Task B specific code
}

Task Common {
    # Shared functionality
}
```

### Error: "Maximum dependency depth exceeded"

**Problem:** Too many levels of task dependencies.

**Solution:**

```powershell
# Visualize task dependencies
Invoke-psake -buildFile .\psakefile.ps1 -docs -detaileddocs

# Simplify dependency chain
# Bad: Deep nesting
Task Deploy -depends Package
Task Package -depends Test
Task Test -depends Build
Task Build -depends Restore
Task Restore -depends Clean
Task Clean -depends Init

# Better: Flatten where possible
Task Deploy -depends Package
Task Package -depends Test
Task Test -depends Build

Task Build -depends Clean, Restore {
    # Build implementation
}

Task Clean { }
Task Restore { }
```

## Script Errors and Failures

### Error: "Execution of [TaskName] was aborted"

**Problem:** A task or its dependency failed, stopping execution.

**Solution:**

```powershell
# View detailed error information
Invoke-psake -buildFile .\psakefile.ps1 -taskList Build -Verbose

# Use exec to ensure external commands fail the build
Task Build {
    # Bad: Error might be ignored
    dotnet build

    # Good: Use exec to capture exit codes
    exec { dotnet build }
}

# Add error handling for specific scenarios
Task Build {
    try {
        exec { dotnet build -c Release }
    } catch {
        Write-Host "Build failed: $_" -ForegroundColor Red
        Write-Host "Stack trace: $($_.ScriptStackTrace)"
        throw
    }
}
```

### Error: "Cannot bind argument to parameter 'Value'"

**Problem:** Passing incorrect parameter types to psake or tasks.

**Solution:**

```powershell
# Ensure parameters are properly defined
Properties {
    $Configuration = 'Debug'
    $BuildNumber = 0
    $EnableTests = $true
}

# Pass parameters correctly
Invoke-psake -buildFile .\psakefile.ps1 `
    -parameters @{
        Configuration = 'Release'
        BuildNumber = 42
        EnableTests = $false
    }

# Validate parameter types in tasks
Task Build {
    if ($BuildNumber -isnot [int]) {
        throw "BuildNumber must be an integer, got: $($BuildNumber.GetType().Name)"
    }
}
```

## Build File Loading Issues

### Error: "Could not find build file"

**Problem:** psake cannot locate the specified build file.

**Solution:**

```powershell
# Specify full path to build file
$buildFile = Join-Path $PSScriptRoot 'psakefile.ps1'
Invoke-psake -buildFile $buildFile

# Or navigate to the directory first
Set-Location $PSScriptRoot
Invoke-psake  # Will find psakefile.ps1 in current directory

# Verify the file exists
if (-not (Test-Path $buildFile)) {
    throw "Build file not found: $buildFile"
}
```

### Error: Syntax errors in build file

**Problem:** The psakefile.ps1 has PowerShell syntax errors.

**Solution:**

```powershell
# Validate syntax before running
$buildFile = '.\psakefile.ps1'
$errors = $null
$null = [System.Management.Automation.PSParser]::Tokenize(
    (Get-Content $buildFile -Raw),
    [ref]$errors
)

if ($errors) {
    Write-Error "Syntax errors in build file:"
    $errors | ForEach-Object {
        Write-Error "$($_.Message) at line $($_.Token.StartLine)"
    }
} else {
    Invoke-psake -buildFile $buildFile
}

# Or use PSScriptAnalyzer for better validation
Install-Module PSScriptAnalyzer -Scope CurrentUser
Invoke-ScriptAnalyzer -Path .\psakefile.ps1
```

## See Also

- [Debugging Guide](/docs/troubleshooting/debugging-guide) - Comprehensive debugging techniques
- [FAQ](/docs/troubleshooting/faq) - Frequently asked questions
- [How to Fail a Build](/docs/tutorial-basics/how-to-fail-a-build) - Controlling build failures
- [Logging Errors](/docs/tutorial-advanced/logging-errors) - Error logging strategies
- [Build Script Resilience](/docs/tutorial-advanced/build-script-resilience) - Writing robust builds
