---
title: "Exit Codes"
description: "Reference guide for psake exit codes and how to handle them in CI/CD pipelines"
---

# Exit Codes

Understanding exit codes is crucial for integrating psake with CI/CD systems and handling build failures correctly.

## Overview

psake returns exit codes to indicate the success or failure of a build:

- **Exit code 0**: Build succeeded
- **Exit code 1**: Build failed

The exit code is set automatically based on whether all tasks completed successfully or if any errors occurred during execution.

## Exit Code Behavior

### Success (Exit Code 0)

psake returns exit code `0` when:

- All specified tasks complete without errors
- All task dependencies run successfully
- No `exec` commands fail (unless using `-continueOnError`)
- No assertions fail
- No unhandled exceptions are thrown
- All postconditions pass

```powershell
# Successful build
Invoke-psake -taskList Build

# Check exit code
echo $LASTEXITCODE  # Output: 0
```

### Failure (Exit Code 1)

psake returns exit code `1` when:

- Any task throws an unhandled exception
- Any `exec` command fails (returns non-zero exit code)
- Any assertion fails
- Any postcondition fails
- Required variables are missing
- Circular task dependencies are detected
- Build script has syntax errors

```powershell
# Failed build
Invoke-psake -taskList Deploy

# Check exit code
echo $LASTEXITCODE  # Output: 1
```

## Checking Exit Codes

### In PowerShell

```powershell
# Method 1: Check $LASTEXITCODE
Invoke-psake -buildFile .\psakefile.ps1 -taskList Build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
} else {
    Write-Host "Build succeeded" -ForegroundColor Green
}
```

```powershell
# Method 2: Use try-catch
try {
    Invoke-psake -buildFile .\psakefile.ps1 -taskList Build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
}
catch {
    Write-Error "Build error: $_"
    exit 1
}
```

```powershell
# Method 3: Use ErrorAction
Invoke-psake -buildFile .\psakefile.ps1 -taskList Build -ErrorAction Stop

# Execution stops here if build fails
Write-Host "Build succeeded"
```

### In Bash/Shell Scripts

```bash
#!/bin/bash

# Run psake build
pwsh -Command "Invoke-psake -buildFile ./psakefile.ps1 -taskList Build"

# Check exit code
if [ $? -eq 0 ]; then
    echo "Build succeeded"
else
    echo "Build failed with exit code: $?"
    exit 1
fi
```

```bash
# Using set -e (exit on error)
#!/bin/bash
set -e  # Exit immediately if any command fails

pwsh -Command "Invoke-psake -taskList Build"
echo "Build succeeded"
```

### In Batch Files (Windows)

```batch
@echo off

REM Run psake build
pwsh -Command "Invoke-psake -taskList Build"

REM Check exit code
if %ERRORLEVEL% neq 0 (
    echo Build failed with exit code: %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo Build succeeded
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Scope CurrentUser -Force

      - name: Run build
        shell: pwsh
        run: |
          Invoke-psake -taskList Build
          if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
          }

      # Alternative: Let GitHub Actions detect failure automatically
      - name: Run build (simpler)
        shell: pwsh
        run: |
          Invoke-psake -taskList Build
          exit $LASTEXITCODE
```

**Note:** GitHub Actions automatically fails the job if any step returns a non-zero exit code.

### Azure Pipelines

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - pwsh: |
      Install-Module -Name psake -Scope CurrentUser -Force
    displayName: 'Install psake'

  - pwsh: |
      Invoke-psake -taskList Build
      if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
      }
    displayName: 'Run build'

  # Alternative: Use failOnStderr
  - pwsh: |
      Invoke-psake -taskList Build
      exit $LASTEXITCODE
    displayName: 'Run build'
    failOnStderr: false
```

### GitLab CI

```yaml
build:
  image: mcr.microsoft.com/powershell:latest
  script:
    - pwsh -Command "Install-Module -Name psake -Force"
    - pwsh -Command "Invoke-psake -taskList Build; exit $LASTEXITCODE"
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"
```

**Note:** GitLab CI fails the job if the script returns non-zero.

### Jenkins

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                pwsh '''
                    Install-Module -Name psake -Scope CurrentUser -Force
                    Invoke-psake -taskList Build

                    if ($LASTEXITCODE -ne 0) {
                        throw "Build failed with exit code: $LASTEXITCODE"
                    }
                '''
            }
        }
    }

    post {
        failure {
            echo 'Build failed!'
        }
        success {
            echo 'Build succeeded!'
        }
    }
}
```

### TeamCity

```xml
<!-- Build Step: PowerShell -->
<buildStep type="powershell">
  <param name="script.content">
    Install-Module -Name psake -Scope CurrentUser -Force
    Invoke-psake -taskList Build

    if ($LASTEXITCODE -ne 0) {
      Write-Error "Build failed"
      exit 1
    }
  </param>
  <param name="teamcity.step.mode">default</param>
</buildStep>
```

## Common Exit Code Scenarios

### Scenario 1: External Command Fails

```powershell
Task Build {
    # dotnet build fails (returns exit code 1)
    exec { dotnet build }
}

# Result: psake returns exit code 1
# Reason: exec detected non-zero exit code from dotnet
```

**CI/CD Impact:** Build job fails automatically.

### Scenario 2: Assertion Fails

```powershell
Properties {
    $Version = ''
}

Task Deploy {
    Assert (![string]::IsNullOrEmpty($Version)) "Version is required"
    exec { ./deploy.ps1 -Version $Version }
}

# Result: psake returns exit code 1
# Reason: Assertion failed (Version is empty)
```

**CI/CD Impact:** Build job fails with clear error message.

### Scenario 3: Postcondition Fails

```powershell
Task Build -postcondition { Test-Path './build/app.dll' } {
    exec { dotnet build -o ./build }
}

# If app.dll is not created:
# Result: psake returns exit code 1
# Reason: Postcondition failed
```

**CI/CD Impact:** Build job fails after task completes.

### Scenario 4: Task with ContinueOnError

```powershell
Task Test -continueOnError {
    exec { dotnet test }
    # Even if tests fail, build continues
}

Task Package -depends Test {
    exec { dotnet pack }
}

# Result: psake returns exit code 0 (if Package succeeds)
# Reason: Test failures were ignored due to -continueOnError
```

**Warning:** Use `-continueOnError` carefully in CI/CD. Failed tests may not fail the build.

### Scenario 5: Multiple Tasks, One Fails

```powershell
Invoke-psake -taskList Clean, Build, Test

# If Build fails:
# - Clean runs successfully
# - Build fails (exit code 1)
# - Test doesn't run (dependency failed)
# Result: psake returns exit code 1
```

**CI/CD Impact:** Build job stops at first failure.

## Exit Code Best Practices

### 1. Always Check Exit Codes in CI/CD

```powershell
# BAD: Doesn't check exit code
Invoke-psake -taskList Build
echo "Build complete"

# GOOD: Checks exit code
Invoke-psake -taskList Build
if ($LASTEXITCODE -ne 0) {
    throw "Build failed"
}
echo "Build succeeded"
```

### 2. Use Exec for External Commands

```powershell
# BAD: Doesn't detect failures
Task Build {
    dotnet build
    # Build continues even if dotnet fails
}

# GOOD: Automatically detects failures
Task Build {
    exec { dotnet build }
    # Build fails if dotnet fails
}
```

### 3. Fail Fast with Assertions

```powershell
# Validate prerequisites before expensive operations
Task Deploy {
    Assert (![string]::IsNullOrEmpty($ApiKey)) "API_KEY is required"
    Assert (Test-Path $ArtifactPath) "Build artifacts not found"
    Assert ($Environment -in @('Staging', 'Production')) "Invalid environment"

    # Expensive deployment only runs if assertions pass
    exec { ./deploy.ps1 }
}
```

### 4. Provide Meaningful Error Messages

```powershell
# BAD: Generic error
Task Build {
    exec { dotnet build }
}

# GOOD: Clear error message
Task Build {
    exec { dotnet build } -errorMessage "Failed to compile solution. Check for syntax errors."
}
```

### 5. Don't Swallow Errors

```powershell
# BAD: Hides failures
Task Test {
    try {
        exec { dotnet test }
    }
    catch {
        Write-Warning "Tests failed, but continuing..."
        # Build succeeds even though tests failed!
    }
}

# GOOD: Proper error handling
Task Test {
    try {
        exec { dotnet test }
    }
    catch {
        Write-Error "Tests failed: $_"
        throw  # Re-throw to fail the build
    }
}
```

### 6. Use Exit Codes in Wrapper Scripts

```powershell
# build.ps1 - Wrapper script for psake
param(
    [string]$Task = 'Default',
    [hashtable]$Parameters = @{}
)

# Install psake if needed
if (-not (Get-Module psake -ListAvailable)) {
    Install-Module psake -Scope CurrentUser -Force
}

Import-Module psake

# Run build
Invoke-psake -buildFile ./psakefile.ps1 -taskList $Task -parameters $Parameters

# Propagate exit code
exit $LASTEXITCODE
```

### 7. Handle Exit Codes in Multi-Stage Builds

```powershell
# build.ps1 - Multi-stage build script
$tasks = @('Clean', 'Restore', 'Build', 'Test', 'Package')

foreach ($task in $tasks) {
    Write-Host "Running task: $task" -ForegroundColor Cyan

    Invoke-psake -taskList $task

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Task '$task' failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

Write-Host "All tasks completed successfully" -ForegroundColor Green
```

## Troubleshooting Exit Codes

### Problem: Build Succeeds Locally but Fails in CI

**Possible causes:**
1. Environment variables missing in CI
2. Different PowerShell version in CI
3. Missing dependencies in CI environment
4. Case-sensitive file paths (Linux CI)

**Solution:**
```powershell
Task ValidateEnvironment {
    Assert ($env:API_KEY) "API_KEY environment variable is required"
    Assert ($PSVersionTable.PSVersion.Major -ge 7) "PowerShell 7+ required"
    Assert (Get-Command dotnet -ErrorAction SilentlyContinue) "dotnet CLI not found"
}

Task Build -depends ValidateEnvironment {
    exec { dotnet build }
}
```

### Problem: Exit Code is 0 but Build Should Fail

**Possible causes:**
1. Not using `exec` for external commands
2. Using `-continueOnError` inappropriately
3. Catching exceptions without re-throwing

**Solution:**
```powershell
# Always use exec
Task Build {
    exec { dotnet build }  # Fails if dotnet fails
}

# Don't catch without re-throwing
Task Test {
    try {
        exec { dotnet test }
    }
    catch {
        Write-Error "Tests failed: $_"
        throw  # Re-throw to fail build
    }
}
```

### Problem: Can't Determine Why Build Failed

**Solution:** Enable verbose output and check error details:

```powershell
# Verbose output
Invoke-psake -Verbose

# Capture detailed errors
$ErrorActionPreference = 'Stop'
try {
    Invoke-psake -taskList Build
}
catch {
    Write-Host "Build failed with error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
```

## Exit Codes in Docker

```dockerfile
FROM mcr.microsoft.com/powershell:latest

WORKDIR /build

# Install psake
RUN pwsh -Command "Install-Module -Name psake -Scope CurrentUser -Force"

# Copy build files
COPY . .

# Run build and propagate exit code
CMD ["pwsh", "-Command", "Invoke-psake -taskList Build; exit $LASTEXITCODE"]
```

**Verify in Docker:**
```bash
# Build Docker image
docker build -t myapp-build .

# Run build
docker run --rm myapp-build

# Check exit code
echo $?  # 0 for success, 1 for failure
```

## See Also

- [Glossary](/docs/reference/glossary) - Exit code and error handling terms
- [Configuration Reference](/docs/reference/configuration-reference) - exec and assert functions
- [Common Errors](/docs/troubleshooting/common-errors) - Troubleshooting build failures
- [GitHub Actions Integration](/docs/ci-examples/github-actions) - CI/CD exit code handling
- [Error Handling](/docs/tutorial-advanced/logging-errors) - Advanced error handling patterns
