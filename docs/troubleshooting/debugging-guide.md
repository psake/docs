---
title: "Debugging Guide"
description: "Complete guide to debugging psake builds using PowerShell debugger, verbose output, logging strategies, and task execution analysis"
---

# Debugging Guide

This comprehensive guide covers debugging techniques for psake build scripts, from basic output inspection to advanced PowerShell debugging.

## Quick Debugging Checklist

When your build fails or behaves unexpectedly:

1. **Enable verbose output:** `Invoke-psake -Verbose`
2. **Check task execution order:** `Invoke-psake -docs -detaileddocs`
3. **Verify properties:** Add `Write-Host` statements in your Properties block
4. **Test individual tasks:** Run tasks one at a time
5. **Check external command output:** Use `exec` with verbose flag
6. **Use the PowerShell debugger:** Set breakpoints for complex issues

## Verbose Output

### Basic Verbose Mode

The simplest debugging approach is enabling verbose output:

```powershell
# Enable verbose output
Invoke-psake -buildFile .\psakefile.ps1 -Verbose

# Combine with specific task
Invoke-psake -taskList Build -Verbose

# Also enable debug output
Invoke-psake -Verbose -Debug
```

This shows:
- Task execution order
- Dependency resolution
- Property values
- Detailed execution flow

### Adding Custom Verbose Messages

```powershell
Properties {
    $Configuration = 'Release'
    $BuildDir = Join-Path $PSScriptRoot 'build'

    Write-Verbose "Properties initialized:"
    Write-Verbose "  Configuration: $Configuration"
    Write-Verbose "  BuildDir: $BuildDir"
}

Task Build {
    Write-Verbose "Starting build process"
    Write-Verbose "Current directory: $PWD"

    exec { dotnet build } -Verbose

    Write-Verbose "Build completed successfully"
}
```

### Controlling Output Levels

```powershell
Properties {
    $VerbosePreference = 'Continue'  # Always show verbose
    # Or: 'SilentlyContinue' to hide verbose
}

Task Build {
    # This will show even without -Verbose flag
    Write-Verbose "This is verbose output"

    # Different output levels
    Write-Debug "Debug level information"
    Write-Information "Informational message"
    Write-Warning "Warning message"
    Write-Host "Always visible output"
}
```

## Using PowerShell Debugger

### Setting Breakpoints

**Method 1: Line breakpoints**

```powershell
# Before running psake
Set-PSBreakpoint -Script .\psakefile.ps1 -Line 25

# Run psake (will pause at line 25)
Invoke-psake

# At the breakpoint:
# - Inspect variables: $Configuration, $BuildDir, etc.
# - Step through: s (step into), v (step over), o (step out)
# - Continue: c
# - Quit debugging: q
```

**Method 2: Function/Task breakpoints**

```powershell
# Break when a specific task runs
Set-PSBreakpoint -Script .\psakefile.ps1 -Command Build

# Run psake
Invoke-psake -taskList Build
```

**Method 3: Variable breakpoints**

```powershell
# Break when a variable is read or written
Set-PSBreakpoint -Variable Configuration -Mode ReadWrite -Script .\psakefile.ps1

Invoke-psake
```

**Method 4: Inline breakpoint**

Add directly in your psakefile.ps1:

```powershell
Task Build {
    # Execution will pause here
    Wait-Debugger

    # Or use the older method
    Set-PSBreakpoint -Script $PSCommandPath -Line $MyInvocation.ScriptLineNumber

    exec { dotnet build }
}
```

### Debugger Commands

When paused at a breakpoint:

```powershell
# Inspect variables
$Configuration
$BuildDir
Get-Variable

# Evaluate expressions
Test-Path $BuildDir
$PSScriptRoot

# List local variables
Get-Variable -Scope Local

# View call stack
Get-PSCallStack

# Step commands
s          # Step into
v          # Step over (or 'o' in older versions)
o          # Step out
c          # Continue execution
q          # Quit debugger

# List breakpoints
Get-PSBreakpoint

# Remove breakpoints
Get-PSBreakpoint | Remove-PSBreakpoint
```

### Debugging in VS Code

If using Visual Studio Code with PowerShell extension:

1. Open your psakefile.ps1 in VS Code
2. Click in the gutter to set breakpoints (red dots)
3. Press F5 or use "Run and Debug"
4. Add launch configuration in `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug psake Build",
            "type": "PowerShell",
            "request": "launch",
            "script": "${workspaceFolder}/psakefile.ps1",
            "args": [],
            "cwd": "${workspaceFolder}"
        }
    ]
}
```

Or debug the Invoke-psake call:

```json
{
    "name": "Debug psake",
    "type": "PowerShell",
    "request": "launch",
    "script": "Invoke-psake",
    "args": [
        "-buildFile", "${workspaceFolder}/psakefile.ps1",
        "-taskList", "Build"
    ]
}
```

## Inspecting Task Execution

### View Task Documentation

```powershell
# List all tasks with descriptions
Invoke-psake -docs

# Detailed documentation with dependencies
Invoke-psake -detaileddocs
```

**Example output:**

```
Name            Depends On
----            ----------
Build           Clean, Restore
Test            Build
Package         Test
Deploy          Package
```

### Understanding Task Execution Order

```powershell
# Add task execution logging
FormatTaskName {
    param($taskName)

    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Executing Task: $taskName" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
}

Task Build -depends Clean, Restore {
    Write-Host "Build task running"
}
```

### Tracing Task Dependencies

```powershell
# Create a helper to trace execution
Properties {
    $script:ExecutionTrace = @()
}

FormatTaskName {
    param($taskName)

    $script:ExecutionTrace += @{
        Task = $taskName
        Timestamp = Get-Date
    }

    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting: $taskName" -ForegroundColor Green
}

Task Build -depends Test {
    # Build logic
}

Task Cleanup {
    # Show execution trace at the end
    Write-Host "`nExecution Trace:" -ForegroundColor Yellow
    $script:ExecutionTrace | ForEach-Object {
        Write-Host "  $($_.Timestamp.ToString('HH:mm:ss.fff')) - $($_.Task)"
    }
}
```

### Testing Task Dependencies Individually

```powershell
# Test each task independently
Invoke-psake -taskList Clean
Invoke-psake -taskList Restore
Invoke-psake -taskList Build

# This helps identify which task is failing
```

## Logging Strategies

### Basic File Logging

```powershell
Properties {
    $LogFile = Join-Path $PSScriptRoot 'build.log'

    # Initialize log file
    "Build started at $(Get-Date)" | Set-Content $LogFile
}

function Write-BuildLog {
    param([string]$Message)

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] $Message"

    # Write to console and file
    Write-Host $logMessage
    $logMessage | Add-Content $script:LogFile
}

Task Build {
    Write-BuildLog "Starting build for configuration: $Configuration"

    try {
        exec { dotnet build }
        Write-BuildLog "Build succeeded"
    } catch {
        Write-BuildLog "Build failed: $_"
        throw
    }
}
```

### Structured Logging

```powershell
Properties {
    $LogFile = Join-Path $PSScriptRoot 'build.json'
    $script:BuildLog = @{
        StartTime = Get-Date
        Tasks = @()
        Properties = @{
            Configuration = $Configuration
            BuildNumber = $BuildNumber
        }
    }
}

function Add-TaskLog {
    param(
        [string]$TaskName,
        [string]$Status,
        [string]$Message = '',
        [timespan]$Duration
    )

    $script:BuildLog.Tasks += @{
        Task = $TaskName
        Status = $Status
        Message = $Message
        Duration = $Duration.TotalSeconds
        Timestamp = Get-Date
    }
}

FormatTaskName {
    param($taskName)

    $script:CurrentTaskStart = Get-Date
    $script:CurrentTaskName = $taskName
}

Task Build {
    $taskStart = Get-Date

    try {
        exec { dotnet build }
        $duration = (Get-Date) - $taskStart
        Add-TaskLog -TaskName 'Build' -Status 'Success' -Duration $duration
    } catch {
        $duration = (Get-Date) - $taskStart
        Add-TaskLog -TaskName 'Build' -Status 'Failed' -Message $_.Exception.Message -Duration $duration
        throw
    }
}

Task Cleanup {
    # Save log to file
    $script:BuildLog.EndTime = Get-Date
    $script:BuildLog.Duration = ($script:BuildLog.EndTime - $script:BuildLog.StartTime).TotalSeconds

    $script:BuildLog | ConvertTo-Json -Depth 10 | Set-Content $LogFile
    Write-Host "Build log saved to: $LogFile"
}
```

### Logging External Command Output

```powershell
Task Build {
    $logFile = Join-Path $PSScriptRoot 'build-output.log'

    # Capture and log command output
    $output = exec { dotnet build } -PassThru
    $output | Set-Content $logFile

    # Or redirect output
    exec { dotnet build 2>&1 | Tee-Object -FilePath $logFile }
}
```

### Integration with Logging Frameworks

```powershell
# Using PSFramework (install: Install-Module PSFramework)
Import-Module PSFramework

Properties {
    # Configure logging
    Set-PSFLoggingProvider -Name logfile -FilePath './logs/build.log' -Enabled $true
}

Task Build {
    Write-PSFMessage -Level Important "Starting build"

    try {
        exec { dotnet build }
        Write-PSFMessage -Level Significant "Build completed successfully"
    } catch {
        Write-PSFMessage -Level Error "Build failed" -ErrorRecord $_
        throw
    }
}
```

## Debugging External Commands

### Using exec with Verbose Output

```powershell
Task Build {
    # Show command being executed
    exec { dotnet build } -Verbose

    # Or manually log it
    $cmd = 'dotnet build'
    Write-Host "Executing: $cmd" -ForegroundColor Yellow
    exec { & $cmd }
}
```

### Capturing Exit Codes

```powershell
Task Build {
    # exec will throw on non-zero exit code
    try {
        exec { dotnet build }
    } catch {
        Write-Host "Command failed with exit code: $LASTEXITCODE"
        Write-Host "Error: $_"
        throw
    }
}
```

### Debugging Command Failures

```powershell
Task Build {
    # Run command with error handling
    $ErrorActionPreference = 'Continue'

    $output = dotnet build 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Output:" -ForegroundColor Red
        $output | ForEach-Object { Write-Host $_ -ForegroundColor Red }

        # Optionally save to file for analysis
        $output | Set-Content './build-error.log'

        throw "Build failed. See build-error.log for details."
    }
}
```

### Testing Commands Interactively

```powershell
Task Build {
    # Use -WhatIf pattern for dry runs
    if ($WhatIfPreference) {
        Write-Host "Would execute: dotnet build -c $Configuration"
        return
    }

    exec { dotnet build -c $Configuration }
}

# Invoke with:
# Invoke-psake -WhatIf
```

## Common Debugging Scenarios

### Scenario 1: Task Not Running as Expected

**Problem:** A task doesn't execute or executes in wrong order.

**Debug steps:**

```powershell
# 1. Check if task exists
Invoke-psake -docs

# 2. View task dependencies
Invoke-psake -detaileddocs

# 3. Add execution tracing
FormatTaskName {
    param($taskName)
    Write-Host ">>> Executing: $taskName at $(Get-Date -Format 'HH:mm:ss.fff')"
}

# 4. Check preconditions
Task Build -precondition { $Configuration -eq 'Release' } {
    Write-Host "Precondition passed: Configuration = $Configuration"
    # Task logic
}
```

### Scenario 2: Properties Have Unexpected Values

**Problem:** Properties don't have the values you expect.

**Debug steps:**

```powershell
Properties {
    $Configuration = 'Debug'
    $BuildNumber = $env:BUILD_NUMBER ?? '0'

    # Debug output
    Write-Host "=== Property Values ===" -ForegroundColor Cyan
    Get-Variable -Scope Script | Where-Object {
        $_.Name -in @('Configuration', 'BuildNumber')
    } | ForEach-Object {
        Write-Host "$($_.Name) = $($_.Value)"
    }
}

# Or create a debug task
Task ShowProperties {
    Write-Host "Configuration: $Configuration"
    Write-Host "BuildNumber: $BuildNumber"
    Write-Host "PSScriptRoot: $PSScriptRoot"

    # Show all properties
    Get-Variable -Scope Script | Format-Table Name, Value
}

# Run: Invoke-psake -taskList ShowProperties
```

### Scenario 3: Path Issues

**Problem:** Files or directories not found.

**Debug steps:**

```powershell
Task Build {
    # Debug paths
    Write-Host "Current directory: $PWD"
    Write-Host "Script root: $PSScriptRoot"
    Write-Host "Build directory: $BuildDir"

    # Verify paths exist
    @($BuildDir, $SrcDir, $TestDir) | ForEach-Object {
        if (Test-Path $_) {
            Write-Host "✓ Found: $_" -ForegroundColor Green
        } else {
            Write-Host "✗ Missing: $_" -ForegroundColor Red
        }
    }

    # List contents
    Write-Host "`nContents of $SrcDir:"
    Get-ChildItem $SrcDir | ForEach-Object {
        Write-Host "  $($_.Name)"
    }
}
```

### Scenario 4: Dependency Cycle

**Problem:** Circular dependency error.

**Debug steps:**

```powershell
# Use detailed docs to visualize dependencies
Invoke-psake -detaileddocs

# Create a dependency graph
Task ShowDependencies {
    $tasks = @{
        Build = @('Clean', 'Restore')
        Test = @('Build')
        Package = @('Test')
        Deploy = @('Package')
    }

    Write-Host "Task Dependency Graph:"
    $tasks.GetEnumerator() | ForEach-Object {
        Write-Host "$($_.Key) -> $($_.Value -join ', ')"
    }
}
```

## Performance Debugging

### Measuring Task Execution Time

```powershell
Properties {
    $script:TaskTimings = @{}
}

FormatTaskName {
    param($taskName)

    $script:CurrentTask = $taskName
    $script:TaskTimings[$taskName] = @{
        Start = Get-Date
    }

    Write-Host "[$([Math]::Round(((Get-Date) - $script:BuildStart).TotalSeconds, 2))s] Starting: $taskName"
}

# Override TaskTearDown to capture end time
TaskTearDown {
    $end = Get-Date
    $start = $script:TaskTimings[$script:CurrentTask].Start
    $duration = ($end - $start).TotalSeconds

    $script:TaskTimings[$script:CurrentTask].Duration = $duration

    Write-Host "[$([Math]::Round(((Get-Date) - $script:BuildStart).TotalSeconds, 2))s] Completed: $script:CurrentTask (took $([Math]::Round($duration, 2))s)"
}

Properties {
    $script:BuildStart = Get-Date
}

Task Summary {
    Write-Host "`n=== Task Performance ===" -ForegroundColor Yellow
    $script:TaskTimings.GetEnumerator() | Sort-Object { $_.Value.Duration } -Descending | ForEach-Object {
        $duration = [Math]::Round($_.Value.Duration, 2)
        Write-Host "$($_.Key): ${duration}s"
    }

    $total = [Math]::Round(((Get-Date) - $script:BuildStart).TotalSeconds, 2)
    Write-Host "`nTotal build time: ${total}s" -ForegroundColor Green
}
```

### Identifying Slow Operations

```powershell
function Measure-BuildStep {
    param(
        [string]$Name,
        [scriptblock]$ScriptBlock
    )

    Write-Host "Starting: $Name..." -NoNewline
    $start = Get-Date

    try {
        & $ScriptBlock
        $duration = ((Get-Date) - $start).TotalSeconds
        Write-Host " completed in $([Math]::Round($duration, 2))s" -ForegroundColor Green
    } catch {
        $duration = ((Get-Date) - $start).TotalSeconds
        Write-Host " failed after $([Math]::Round($duration, 2))s" -ForegroundColor Red
        throw
    }
}

Task Build {
    Measure-BuildStep "Restore packages" {
        exec { dotnet restore }
    }

    Measure-BuildStep "Compile code" {
        exec { dotnet build --no-restore }
    }

    Measure-BuildStep "Run tests" {
        exec { dotnet test --no-build }
    }
}
```

## Advanced Debugging Techniques

### Remote Debugging

```powershell
# On remote machine, enable PowerShell remoting
Enable-PSRemoting -Force

# From local machine
$session = New-PSSession -ComputerName remote-server

# Run psake remotely with debugging
Invoke-Command -Session $session -ScriptBlock {
    Import-Module psake
    Set-PSBreakpoint -Script C:\builds\psakefile.ps1 -Line 50
    Invoke-psake -buildFile C:\builds\psakefile.ps1
}

# Enter interactive session for debugging
Enter-PSSession $session
```

### Debugging in CI/CD

```powershell
# Add CI-specific debugging
Properties {
    $IsCI = $env:CI -eq 'true'
}

Task Build {
    if ($IsCI) {
        # More verbose output in CI
        $VerbosePreference = 'Continue'
        $DebugPreference = 'Continue'

        # Dump environment
        Write-Host "=== Environment Variables ==="
        Get-ChildItem env: | Sort-Object Name | ForEach-Object {
            Write-Host "$($_.Name) = $($_.Value)"
        }
    }

    exec { dotnet build } -Verbose:$IsCI
}
```

### Creating Debug Snapshots

```powershell
Task CreateDebugSnapshot {
    $snapshotDir = Join-Path $PSScriptRoot 'debug-snapshot'
    New-Item -ItemType Directory -Path $snapshotDir -Force | Out-Null

    # Capture environment state
    @{
        PowerShellVersion = $PSVersionTable
        EnvironmentVariables = Get-ChildItem env: | ForEach-Object { @{$_.Name = $_.Value} }
        InstalledModules = Get-Module -ListAvailable | Select-Object Name, Version
        WorkingDirectory = $PWD
        Properties = @{
            Configuration = $Configuration
            BuildDir = $BuildDir
        }
        Timestamp = Get-Date
    } | ConvertTo-Json -Depth 10 | Set-Content "$snapshotDir/snapshot.json"

    # Copy relevant files
    Copy-Item .\psakefile.ps1 $snapshotDir
    Copy-Item .\*.log $snapshotDir -ErrorAction SilentlyContinue

    Write-Host "Debug snapshot saved to: $snapshotDir"
}
```

## See Also

- [Common Errors](/docs/troubleshooting/common-errors) - Solutions to frequent errors
- [FAQ](/docs/troubleshooting/faq) - Frequently asked questions
- [Debug Script](/docs/tutorial-advanced/debug-script) - Basic debugging tutorial
- [Logging Errors](/docs/tutorial-advanced/logging-errors) - Error logging strategies
- [Build Script Resilience](/docs/tutorial-advanced/build-script-resilience) - Writing robust builds
