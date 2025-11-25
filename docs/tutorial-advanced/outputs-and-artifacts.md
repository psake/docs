---
title: "Outputs and Artifacts"
description: "Best practices for returning data and managing build artifacts in psake scripts"
---

# Outputs and Artifacts

When building with psake, you often need to pass information between tasks, return data to the calling script, or generate artifacts like compiled binaries or deployment packages. This guide explains the recommended approaches for handling outputs and artifacts.

## Understanding psake's Output Model

psake's primary output mechanism is **exit codes**:
- **Exit code 0**: Build succeeded
- **Exit code 1**: Build failed

The `Invoke-psake` function itself **does not return custom objects** or data structures. Instead, use one of the patterns described below.

## Recommended Patterns

### 1. Script-Level Variables (Best for Simple Data)

The most straightforward way to return data from a psake build is using script-level variables that persist after `Invoke-psake` completes.

#### Example: Returning a Hashtable

```powershell title="psakefile.ps1"
# Declare script-level variable
$script:BuildOutput = @{}

Properties {
    $ArtifactDir = "./artifacts"
}

Task Build {
    # Perform build
    exec { dotnet build -o $ArtifactDir }

    # Populate output data
    $script:BuildOutput.ArtifactUrl = "https://cdn.example.com/builds/1.0.0/app.zip"
    $script:BuildOutput.Version = "1.0.0"
    $script:BuildOutput.BuildTime = Get-Date
}
```

```powershell title="build.ps1 (calling script)"
# Import psake
Import-Module psake

# Run build
Invoke-psake -buildFile .\psakefile.ps1 -taskList Build

# Check exit code
if ($LASTEXITCODE -ne 0) {
    throw "Build failed"
}

# Access the output data
Write-Host "Artifact URL: $($BuildOutput.ArtifactUrl)"
Write-Host "Version: $($BuildOutput.Version)"
Write-Host "Build Time: $($BuildOutput.BuildTime)"

# Use the data in subsequent operations
if (![string]::IsNullOrEmpty($BuildOutput.ArtifactUrl)) {
    # Deploy, upload, or process artifact
    Write-Host "Ready to deploy artifact at: $($BuildOutput.ArtifactUrl)"
}
```

**Pros:**
- Simple and direct
- No file I/O overhead
- Type-safe (can use any PowerShell object)
- Data available immediately

**Cons:**
- Only works when calling `Invoke-psake` from PowerShell
- Variables must be script-scoped
- Not suitable for CI/CD pipelines that need persistent artifacts

### 2. Output Files (Best for CI/CD and Complex Data)

For CI/CD pipelines or when you need persistent, structured data, write outputs to files.

#### JSON Output File

```powershell title="psakefile.ps1"
Properties {
    $OutputFile = "./build-output.json"
    $ArtifactDir = "./artifacts"
}

Task Build {
    exec { dotnet build -o $ArtifactDir }

    # Create output object
    $output = @{
        ArtifactUrl = "https://cdn.example.com/builds/1.0.0/app.zip"
        Version = "1.0.0"
        BuildTime = (Get-Date).ToString("o")
        Artifacts = @(
            @{ Name = "app.dll"; Path = "$ArtifactDir/app.dll" }
            @{ Name = "app.pdb"; Path = "$ArtifactDir/app.pdb" }
        )
    }

    # Write to JSON file
    $output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile

    Write-Host "Build output written to: $OutputFile" -ForegroundColor Green
}
```

```powershell title="deploy.ps1 (subsequent script)"
# Read build output
$buildOutput = Get-Content ./build-output.json | ConvertFrom-Json

# Use the data
Write-Host "Deploying version: $($buildOutput.Version)"
Write-Host "Artifact URL: $($buildOutput.ArtifactUrl)"

foreach ($artifact in $buildOutput.Artifacts) {
    Write-Host "  Artifact: $($artifact.Name) at $($artifact.Path)"
}
```

#### YAML Output File

```powershell
Task Build {
    # Create output object
    $output = @{
        artifact_url = "https://cdn.example.com/builds/1.0.0/app.zip"
        version = "1.0.0"
        build_time = (Get-Date).ToString("o")
    }

    # Write to YAML file (requires powershell-yaml module)
    $output | ConvertTo-Yaml | Set-Content ./build-output.yml
}
```

**Pros:**
- Works across different processes and languages
- Persists between build steps
- Ideal for CI/CD pipelines
- Can be version controlled or uploaded as artifacts
- Human-readable (JSON/YAML)

**Cons:**
- File I/O overhead
- Requires parsing in consuming code
- Need to handle file paths carefully

### 3. Environment Variables (Best for CI/CD Integration)

Environment variables are excellent for passing data to CI/CD systems like GitHub Actions, Azure Pipelines, or GitLab CI.

```powershell title="psakefile.ps1"
Task Build {
    exec { dotnet build }

    # Set environment variables
    $env:BUILD_ARTIFACT_URL = "https://cdn.example.com/builds/1.0.0/app.zip"
    $env:BUILD_VERSION = "1.0.0"

    Write-Host "Set BUILD_ARTIFACT_URL=$env:BUILD_ARTIFACT_URL"
    Write-Host "Set BUILD_VERSION=$env:BUILD_VERSION"
}
```

#### GitHub Actions Integration

```yaml title=".github/workflows/build.yml"
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run psake build
        shell: pwsh
        run: |
          Import-Module psake
          Invoke-psake -taskList Build

          # Export environment variables for subsequent steps
          echo "BUILD_ARTIFACT_URL=$env:BUILD_ARTIFACT_URL" >> $env:GITHUB_ENV
          echo "BUILD_VERSION=$env:BUILD_VERSION" >> $env:GITHUB_ENV

      - name: Deploy artifact
        shell: pwsh
        run: |
          Write-Host "Deploying version $env:BUILD_VERSION"
          Write-Host "Artifact URL: $env:BUILD_ARTIFACT_URL"
```

**Pros:**
- Native CI/CD integration
- Simple to use
- No file management

**Cons:**
- Limited to string values
- Not suitable for complex objects
- Environment variables may not persist across processes

### 4. BuildTearDown for Centralized Reporting

Use `BuildTearDown` to generate summary reports or outputs after all tasks complete.

```powershell title="psakefile.ps1"
# Track build metadata
$script:BuildMetrics = @{
    TasksExecuted = @()
    StartTime = $null
    EndTime = $null
}

BuildSetup {
    $script:BuildMetrics.StartTime = Get-Date
}

TaskSetup {
    $taskName = $psake.context.Peek().currentTaskName
    $script:BuildMetrics.TasksExecuted += $taskName
}

BuildTearDown {
    $script:BuildMetrics.EndTime = Get-Date
    $duration = $script:BuildMetrics.EndTime - $script:BuildMetrics.StartTime

    # Create summary report
    $summary = @{
        Success = $psake.build_success
        Duration = $duration.TotalSeconds
        TasksExecuted = $script:BuildMetrics.TasksExecuted
        ArtifactUrl = $script:BuildOutput.ArtifactUrl
    }

    # Write to file
    $summary | ConvertTo-Json | Set-Content ./build-summary.json

    Write-Host "`n========== Build Summary ==========" -ForegroundColor Cyan
    Write-Host "Status: $(if ($psake.build_success) { 'SUCCESS' } else { 'FAILED' })"
    Write-Host "Duration: $($duration.TotalSeconds) seconds"
    Write-Host "Tasks: $($script:BuildMetrics.TasksExecuted -join ', ')"
    Write-Host "===================================" -ForegroundColor Cyan
}

Task Build {
    # Build logic
    exec { dotnet build }

    # Set artifact URL
    $script:BuildOutput = @{
        ArtifactUrl = "https://cdn.example.com/builds/1.0.0/app.zip"
    }
}
```

**Pros:**
- Centralized output logic
- Executes regardless of success/failure
- Good for metrics and reporting

**Cons:**
- Only runs after all tasks complete
- Cannot be used for inter-task communication

## Anti-Patterns to Avoid

### Don't Use Write-Host for Structured Data

```powershell
# ❌ BAD: Mixing structured data with console output
Task Build {
    Write-Host "ARTIFACT_URL:https://cdn.example.com/builds/1.0.0/app.zip"
    Write-Host "VERSION:1.0.0"
}
```

**Why it's bad:**
- Fragile parsing required
- Mixes data with informational messages
- Hard to distinguish from psake's own output
- Not machine-readable

**Better approach:** Use script variables or output files

### Don't Use Write-Output for Return Values

```powershell
# ❌ BAD: Attempting to return data via Write-Output
Task Build {
    $result = @{ ArtifactUrl = "https://example.com/app.zip" }
    Write-Output $result  # Gets mixed with psake output
}
```

**Why it's bad:**
- Output gets mixed with psake's verbose logging
- Difficult to capture reliably
- Not the intended use of `Invoke-psake`

**Better approach:** Use script variables or output files

### Don't Use Global Variables

```powershell
# ❌ BAD: Using global scope
Task Build {
    $global:ArtifactUrl = "https://example.com/app.zip"
}
```

**Why it's bad:**
- Pollutes global namespace
- Hard to track and debug
- Not clear which task sets which globals

**Better approach:** Use script-scoped variables with clear naming

## Complete Example: Multi-Task Build with Outputs

```powershell title="psakefile.ps1"
#requires -Version 7

# Script-level output container
$script:BuildOutput = @{
    Version = $null
    ArtifactPaths = @()
    ArtifactUrl = $null
    TestResults = @{}
}

Properties {
    $Configuration = "Release"
    $ArtifactDir = "./artifacts"
    $OutputFile = "./build-output.json"
}

Task Default -Depends Build, Test, Package

Task Build {
    Write-Host "Building solution..." -ForegroundColor Green

    # Get version from project file
    [xml]$project = Get-Content ./src/App.csproj
    $script:BuildOutput.Version = $project.Project.PropertyGroup.Version

    # Build
    exec { dotnet build -c $Configuration }

    Write-Host "Built version: $($script:BuildOutput.Version)"
}

Task Test -Depends Build {
    Write-Host "Running tests..." -ForegroundColor Green

    $testResult = exec { dotnet test --no-build -c $Configuration } -returnCode

    $script:BuildOutput.TestResults = @{
        Passed = ($testResult -eq 0)
        ExitCode = $testResult
    }

    if ($testResult -ne 0) {
        throw "Tests failed"
    }
}

Task Package -Depends Test {
    Write-Host "Creating package..." -ForegroundColor Green

    # Create artifact directory
    if (-not (Test-Path $ArtifactDir)) {
        New-Item -ItemType Directory -Path $ArtifactDir | Out-Null
    }

    # Publish application
    exec { dotnet publish -c $Configuration -o $ArtifactDir }

    # Create zip archive
    $zipName = "app-v$($script:BuildOutput.Version).zip"
    $zipPath = Join-Path $ArtifactDir $zipName
    Compress-Archive -Path "$ArtifactDir/*" -DestinationPath $zipPath -Force

    # Record artifact paths
    $script:BuildOutput.ArtifactPaths += $zipPath

    # Simulate upload and get URL
    $script:BuildOutput.ArtifactUrl = "https://cdn.example.com/builds/$($script:BuildOutput.Version)/$zipName"

    Write-Host "Package created: $zipPath"
    Write-Host "Artifact URL: $($script:BuildOutput.ArtifactUrl)"
}

BuildTearDown {
    # Always write output file, even on failure
    $script:BuildOutput | ConvertTo-Json -Depth 10 | Set-Content $OutputFile

    Write-Host "`nBuild output written to: $OutputFile" -ForegroundColor Cyan

    if ($psake.build_success) {
        Write-Host "Build completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Build failed!" -ForegroundColor Red
    }
}
```

```powershell title="build.ps1 (wrapper script)"
param(
    [string]$Task = "Default"
)

# Import psake
if (-not (Get-Module psake -ListAvailable)) {
    Install-Module psake -Scope CurrentUser -Force
}
Import-Module psake

# Run build
Invoke-psake -buildFile ./psakefile.ps1 -taskList $Task

# Check result
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed with exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Read output file
if (Test-Path ./build-output.json) {
    $output = Get-Content ./build-output.json | ConvertFrom-Json

    Write-Host "`n========== Build Results ==========" -ForegroundColor Cyan
    Write-Host "Version: $($output.Version)"
    Write-Host "Artifact URL: $($output.ArtifactUrl)"
    Write-Host "Test Status: $(if ($output.TestResults.Passed) { 'PASSED' } else { 'FAILED' })"
    Write-Host "Artifacts:"
    foreach ($artifact in $output.ArtifactPaths) {
        Write-Host "  - $artifact"
    }
    Write-Host "===================================`n" -ForegroundColor Cyan

    # Return the output for use by caller
    return $output
}

exit 0
```

## Best Practices Summary

1. **Use script-scoped variables** for simple data that stays within PowerShell
2. **Write JSON/YAML files** for complex data, CI/CD integration, and persistence
3. **Use environment variables** for simple string values in CI/CD pipelines
4. **Use BuildTearDown** for summary reports and metrics
5. **Always check exit codes** - they remain the primary success indicator
6. **Avoid Write-Host/Write-Output** for structured data
7. **Document your output schema** so consumers know what to expect
8. **Handle failures gracefully** - ensure output files are written even on build failure

## See Also

- [Exit Codes](/docs/reference/exit-codes) - Understanding psake's primary output mechanism
- [Structure of a psake Build Script](/docs/tutorial-advanced/structure-of-a-psake-build-script) - Build script components
- [Parameters & Properties](/docs/tutorial-basics/parameters-properties) - Passing data into builds
- [Build Script Resilience](/docs/tutorial-advanced/build-script-resilience) - Error handling patterns
- [GitHub Actions Integration](/docs/ci-examples/github-actions) - CI/CD examples
