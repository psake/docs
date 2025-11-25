---
title: "Outputs and Artifacts"
description: "Best practices for returning data and managing build artifacts in psake scripts"
---

# Outputs and Artifacts

When building with psake, you often need to pass information between tasks, return data to the calling script, or generate artifacts like compiled binaries or deployment packages. This guide explains the recommended approaches for handling outputs and artifacts.

## Understanding psake's Output Model

**Important:** psake executes your build script in its own scope, which means:

- The `Invoke-psake` function **does not return custom objects** or data structures
- Variables defined inside your psakefile (even with `$script:` scope) are **not accessible** after `Invoke-psake` completes
- psake's primary success/failure indicator is the **exit code** (0 = success, 1 = failure)

To return data from a psake build, you must use external mechanisms like files or environment variables.

## Recommended Patterns

### 1. Output Files (Primary Recommended Approach)

**This is the best practice for returning data from psake builds.** Write your outputs to JSON or YAML files that can be read after the build completes.

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

```powershell title="build.ps1 (calling script)"
# Import and run psake
Import-Module psake
Invoke-psake -buildFile ./psakefile.ps1 -taskList Build

# Check exit code
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed with exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Read the output file
if (Test-Path ./build-output.json) {
    $buildOutput = Get-Content ./build-output.json | ConvertFrom-Json

    Write-Host "`n========== Build Results ==========" -ForegroundColor Cyan
    Write-Host "Version: $($buildOutput.Version)"
    Write-Host "Artifact URL: $($buildOutput.ArtifactUrl)"
    Write-Host "Build Time: $($buildOutput.BuildTime)"
    Write-Host "Artifacts:"
    foreach ($artifact in $buildOutput.Artifacts) {
        Write-Host "  - $($artifact.Name) at $($artifact.Path)"
    }
    Write-Host "===================================`n" -ForegroundColor Cyan
}

exit 0
```

**Answer to the original question:** For your use case of returning a hashtable with an `ArtifactUrl` field, write it to a JSON file as shown above. This is the standard, reliable approach.

#### YAML Output File

```powershell title="psakefile.ps1"
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
- **Actually works** - data persists after psake completes
- Works across different processes and languages
- Ideal for CI/CD pipelines
- Can be version controlled or uploaded as artifacts
- Human-readable (JSON/YAML)
- Type-safe when using structured formats

**Cons:**
- File I/O overhead
- Requires parsing in consuming code
- Need to handle file paths carefully

**When to use:** This should be your default choice for returning build metadata, artifact URLs, or any structured data.

### 2. Environment Variables (For CI/CD Integration)

Environment variables can pass simple string values to CI/CD systems, but be aware that they may not persist in all PowerShell scenarios.

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
- **Limited to string values** - cannot return complex objects
- **May not persist** outside the psake process in all scenarios
- Less reliable than output files

**When to use:** In CI/CD pipelines where you need to pass simple string values to subsequent steps. For reliability, combine with output files.

### 3. Sharing Data Between Tasks (Within Same Build)

While you cannot return data from `Invoke-psake` to the caller using variables, you **can** share data between tasks within the same build using script-scoped variables.

```powershell title="psakefile.ps1"
# Script-scoped variable accessible to all tasks
$script:BuildMetadata = @{}

Properties {
    $Configuration = "Release"
}

Task Init {
    # Store data for use by other tasks
    $script:BuildMetadata.StartTime = Get-Date
    $script:BuildMetadata.Configuration = $Configuration
}

Task Build -Depends Init {
    # Access data from previous task
    Write-Host "Started at: $($script:BuildMetadata.StartTime)"
    Write-Host "Configuration: $($script:BuildMetadata.Configuration)"

    exec { dotnet build -c $Configuration }

    # Add more data
    $script:BuildMetadata.BuildCompleted = Get-Date
}

Task Package -Depends Build {
    # Access accumulated metadata
    $duration = $script:BuildMetadata.BuildCompleted - $script:BuildMetadata.StartTime
    Write-Host "Build took: $($duration.TotalSeconds) seconds"

    # Package artifacts
    exec { dotnet pack }
}
```

**Important:** These variables are **only** accessible within the same `Invoke-psake` call. They **cannot** be accessed by the calling script.

**When to use:** For passing data between tasks within the same build execution.

### 4. BuildTearDown for Centralized Reporting

Use `BuildTearDown` to generate summary reports or outputs that run after all tasks complete (even on failure).

```powershell title="psakefile.ps1"
# Track build metadata
$script:BuildMetrics = @{
    TasksExecuted = @()
    StartTime = $null
    EndTime = $null
    ArtifactUrl = $null
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

    # Create summary report (IMPORTANT: Write to file, not just variables)
    $summary = @{
        Success = $psake.build_success
        Duration = $duration.TotalSeconds
        TasksExecuted = $script:BuildMetrics.TasksExecuted
        ArtifactUrl = $script:BuildMetrics.ArtifactUrl
        Timestamp = (Get-Date).ToString("o")
    }

    # Write to file so it's accessible after Invoke-psake completes
    $summary | ConvertTo-Json | Set-Content ./build-summary.json

    Write-Host "`n========== Build Summary ==========" -ForegroundColor Cyan
    Write-Host "Status: $(if ($psake.build_success) { 'SUCCESS' } else { 'FAILED' })"
    Write-Host "Duration: $($duration.TotalSeconds) seconds"
    Write-Host "Tasks: $($script:BuildMetrics.TasksExecuted -join ', ')"
    if ($script:BuildMetrics.ArtifactUrl) {
        Write-Host "Artifact: $($script:BuildMetrics.ArtifactUrl)"
    }
    Write-Host "===================================" -ForegroundColor Cyan
}

Task Build {
    exec { dotnet build }

    # Store artifact URL for BuildTearDown to include in summary
    $script:BuildMetrics.ArtifactUrl = "https://cdn.example.com/builds/1.0.0/app.zip"
}
```

**Pros:**
- Centralized output logic
- Executes regardless of success/failure
- Good for metrics and reporting

**Cons:**
- Only runs after all tasks complete
- **Must write to files** to be accessible after Invoke-psake

**When to use:** For generating build summaries, metrics, or cleanup operations that should always run.

## Anti-Patterns to Avoid

### ❌ Don't Rely on Script Variables Being Accessible Outside psake

```powershell
# ❌ BAD: This does NOT work
# psakefile.ps1
$script:BuildOutput = @{ ArtifactUrl = "https://example.com/app.zip" }

Task Build {
    $script:BuildOutput.Version = "1.0.0"
}

# build.ps1
Invoke-psake -buildFile ./psakefile.ps1
Write-Host $BuildOutput.ArtifactUrl  # ❌ $BuildOutput is not defined!
```

**Why it's bad:** psake executes the build file in its own scope. Variables are not accessible after `Invoke-psake` returns.

**Better approach:** Write to an output file (JSON/YAML)

### ❌ Don't Use Write-Host for Structured Data

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

**Better approach:** Write to JSON file

### ❌ Don't Use Write-Output for Return Values

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

**Better approach:** Write to JSON file

### ❌ Don't Use Global Variables

```powershell
# ❌ BAD: Using global scope
Task Build {
    $global:ArtifactUrl = "https://example.com/app.zip"
}
```

**Why it's bad:**
- Pollutes global namespace
- Hard to track and debug
- May not work depending on how psake is invoked
- Not clear which task sets which globals

**Better approach:** Write to JSON file (or use `$script:` for inter-task communication)

## Complete Example: Multi-Task Build with Outputs

This example shows the **recommended pattern** for returning data from a psake build.

```powershell title="psakefile.ps1"
#requires -Version 7

Properties {
    $Configuration = "Release"
    $ArtifactDir = "./artifacts"
    $OutputFile = "./build-output.json"
}

# Internal data sharing between tasks (not accessible outside psake)
$script:InternalBuildData = @{
    Version = $null
    TestsPassed = $false
}

Task Default -Depends Build, Test, Package

Task Build {
    Write-Host "Building solution..." -ForegroundColor Green

    # Get version from project file
    [xml]$project = Get-Content ./src/App.csproj
    $script:InternalBuildData.Version = $project.Project.PropertyGroup.Version

    # Build
    exec { dotnet build -c $Configuration }

    Write-Host "Built version: $($script:InternalBuildData.Version)"
}

Task Test -Depends Build {
    Write-Host "Running tests..." -ForegroundColor Green

    try {
        exec { dotnet test --no-build -c $Configuration }
        $script:InternalBuildData.TestsPassed = $true
    }
    catch {
        $script:InternalBuildData.TestsPassed = $false
        throw
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
    $zipName = "app-v$($script:InternalBuildData.Version).zip"
    $zipPath = Join-Path $ArtifactDir $zipName
    Compress-Archive -Path "$ArtifactDir/*" -DestinationPath $zipPath -Force

    # Simulate upload to CDN (in real scenario, this would actually upload)
    $artifactUrl = "https://cdn.example.com/builds/$($script:InternalBuildData.Version)/$zipName"

    # IMPORTANT: Write outputs to file so they're accessible after Invoke-psake
    $output = @{
        Version = $script:InternalBuildData.Version
        ArtifactUrl = $artifactUrl
        ArtifactPath = $zipPath
        TestsPassed = $script:InternalBuildData.TestsPassed
        BuildTime = (Get-Date).ToString("o")
        Configuration = $Configuration
    }

    $output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile

    Write-Host "Package created: $zipPath"
    Write-Host "Artifact URL: $artifactUrl"
    Write-Host "Output written to: $OutputFile"
}
```

```powershell title="build.ps1 (wrapper script)"
param(
    [string]$Task = "Default",
    [hashtable]$Properties = @{}
)

# Import psake
if (-not (Get-Module psake -ListAvailable)) {
    Install-Module psake -Scope CurrentUser -Force
}
Import-Module psake

# Run build
Write-Host "Running psake build..." -ForegroundColor Cyan
Invoke-psake -buildFile ./psakefile.ps1 -taskList $Task -properties $Properties

# Check result
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed with exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Read and display output file
$outputFile = "./build-output.json"
if (Test-Path $outputFile) {
    $output = Get-Content $outputFile | ConvertFrom-Json

    Write-Host "`n========== Build Results ==========" -ForegroundColor Cyan
    Write-Host "Version: $($output.Version)"
    Write-Host "Configuration: $($output.Configuration)"
    Write-Host "Artifact URL: $($output.ArtifactUrl)"
    Write-Host "Artifact Path: $($output.ArtifactPath)"
    Write-Host "Tests Passed: $($output.TestsPassed)"
    Write-Host "Build Time: $($output.BuildTime)"
    Write-Host "===================================`n" -ForegroundColor Cyan

    # Example: Use the output data for subsequent operations
    if ($output.TestsPassed -and $output.ArtifactUrl) {
        Write-Host "✓ Build artifacts ready for deployment" -ForegroundColor Green
        Write-Host "  Deploy with: ./deploy.ps1 -ArtifactUrl '$($output.ArtifactUrl)'"
    }

    # Make output available to calling code
    return $output
} else {
    Write-Warning "No build output file found at: $outputFile"
}

exit 0
```

```powershell title="deploy.ps1 (example consumer)"
param(
    [Parameter(Mandatory)]
    [string]$ArtifactUrl
)

# This script can be called after the build completes
# It reads the artifact URL from the output file or receives it as a parameter

Write-Host "Deploying artifact from: $ArtifactUrl" -ForegroundColor Green

# Read additional metadata from build output if needed
if (Test-Path ./build-output.json) {
    $buildInfo = Get-Content ./build-output.json | ConvertFrom-Json
    Write-Host "Deploying version: $($buildInfo.Version)"
}

# Deployment logic here...
```

## Usage in CI/CD Pipelines

### GitHub Actions

```yaml title=".github/workflows/build.yml"
name: Build and Deploy

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Scope CurrentUser -Force

      - name: Run build
        shell: pwsh
        run: |
          Import-Module psake
          Invoke-psake -taskList Default

          if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
          }

      - name: Read build output
        id: build-output
        shell: pwsh
        run: |
          $output = Get-Content ./build-output.json | ConvertFrom-Json
          echo "version=$($output.Version)" >> $env:GITHUB_OUTPUT
          echo "artifact_url=$($output.ArtifactUrl)" >> $env:GITHUB_OUTPUT

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts-${{ steps.build-output.outputs.version }}
          path: ./artifacts/

      - name: Deploy (on main branch)
        if: github.ref == 'refs/heads/main'
        shell: pwsh
        run: |
          $output = Get-Content ./build-output.json | ConvertFrom-Json
          ./deploy.ps1 -ArtifactUrl $output.ArtifactUrl
```

### Azure Pipelines

```yaml title="azure-pipelines.yml"
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: UseDotNet@2
    inputs:
      version: '8.0.x'

  - pwsh: Install-Module -Name psake -Scope CurrentUser -Force
    displayName: 'Install psake'

  - pwsh: |
      Import-Module psake
      Invoke-psake -taskList Default

      if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
      }
    displayName: 'Run psake build'

  - pwsh: |
      $output = Get-Content ./build-output.json | ConvertFrom-Json
      Write-Host "##vso[task.setvariable variable=BuildVersion]$($output.Version)"
      Write-Host "##vso[task.setvariable variable=ArtifactUrl]$($output.ArtifactUrl)"
    displayName: 'Extract build outputs'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: './artifacts'
      artifactName: 'drop-$(BuildVersion)'

  - pwsh: |
      Write-Host "Deploying version: $(BuildVersion)"
      Write-Host "Artifact URL: $(ArtifactUrl)"
      ./deploy.ps1 -ArtifactUrl "$(ArtifactUrl)"
    displayName: 'Deploy'
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
```

## Best Practices Summary

1. **Use JSON/YAML output files** - This is the primary recommended approach for returning data
2. **Write to files in BuildTearDown** - Ensures outputs are generated even on failure
3. **Always check exit codes** - They remain the primary success/failure indicator
4. **Use `$script:` variables for inter-task communication** - But understand they're not accessible outside psake
5. **Avoid Write-Host/Write-Output** for structured data - Use files instead
6. **Document your output schema** - So consumers know what to expect
7. **Handle failures gracefully** - Ensure output files contain meaningful error information
8. **Upload output files as CI artifacts** - Makes them available across pipeline stages

## Quick Reference

| Need to... | Use... | Example |
|------------|--------|---------|
| Return data from psake | JSON output file | `$data \| ConvertTo-Json \| Set-Content output.json` |
| Share data between tasks | Script-scoped variables | `$script:BuildData = @{}` |
| Pass simple strings to CI | Environment variables | `$env:BUILD_VERSION = "1.0.0"` |
| Generate build summary | BuildTearDown + output file | See complete example above |
| Pass data INTO psake | Properties or parameters | `Invoke-psake -properties @{Version="1.0"}` |

## See Also

- [Exit Codes](/docs/reference/exit-codes) - Understanding psake's primary output mechanism
- [Structure of a psake Build Script](/docs/tutorial-advanced/structure-of-a-psake-build-script) - Build script components including BuildTearDown
- [Parameters & Properties](/docs/tutorial-basics/parameters-properties) - Passing data INTO builds
- [Build Script Resilience](/docs/tutorial-advanced/build-script-resilience) - Error handling patterns
- [GitHub Actions Integration](/docs/ci-examples/github-actions) - CI/CD examples
