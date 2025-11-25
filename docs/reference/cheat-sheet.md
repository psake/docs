---
title: "Cheat Sheet"
description: "Quick reference guide for common psake patterns, commands, and useful one-liners"
---

# psake Cheat Sheet

Quick reference for common psake tasks, patterns, and commands.

## Installation & Setup

```powershell
# Install psake from PowerShell Gallery
Install-Module -Name psake -Scope CurrentUser

# Install globally (requires admin)
Install-Module -Name psake -Scope AllUsers

# Update to latest version
Update-Module -Name psake

# Check installed version
Get-Module psake -ListAvailable | Select-Object Version

# Import module
Import-Module psake
```

## Basic Invocation

```powershell
# Run default task from psakefile.ps1
Invoke-psake

# Run specific task
Invoke-psake -taskList Build

# Run multiple tasks
Invoke-psake -taskList Clean, Build, Test

# Use custom build file
Invoke-psake -buildFile ./custom-build.ps1

# Pass parameters
Invoke-psake -parameters @{ Configuration = 'Release'; Version = '1.0.0' }

# Show available tasks
Invoke-psake -docs

# Show detailed task information
Invoke-psake -detaileddocs

# Verbose output
Invoke-psake -Verbose
```

## Task Definition Patterns

### Basic Task

```powershell
Task TaskName {
    Write-Host "Doing work..."
}
```

### Task with Dependencies

```powershell
Task Build -depends Clean, Restore {
    exec { dotnet build }
}
```

### Task with Description

```powershell
Task Deploy -description "Deploy application to production" {
    exec { ./deploy.ps1 }
}
```

### Conditional Task (Precondition)

```powershell
Task DeployProd -precondition { $Environment -eq 'Production' } {
    exec { ./deploy.ps1 }
}
```

### Task with Validation (Postcondition)

```powershell
Task Build -postcondition { Test-Path './build/app.dll' } {
    exec { dotnet build -o ./build }
}
```

### Task with Required Properties

```powershell
Task Deploy -requiredVariables 'Environment', 'Version' {
    exec { ./deploy.ps1 -Env $Environment -Ver $Version }
}
```

### Continuous Task (Watches for Changes)

```powershell
Task Watch -continueOnError {
    while ($true) {
        exec { dotnet watch run }
        Start-Sleep -Seconds 1
    }
}
```

## Property Patterns

### Basic Properties

```powershell
Properties {
    $Configuration = 'Release'
    $OutputPath = './build'
    $Version = '1.0.0'
}
```

### Properties from Script Location

```powershell
Properties {
    $BuildScriptDir = Split-Path $psake.build_script_file
    $ProjectRoot = Split-Path $BuildScriptDir
    $SrcDir = Join-Path $ProjectRoot 'src'
}
```

### Properties with Environment Variables

```powershell
Properties {
    $ApiKey = $env:API_KEY
    $BuildNumber = $env:BUILD_NUMBER ?? '0'
    $Environment = $env:DEPLOY_ENV ?? 'Development'
}
```

### Properties with Fallback Values

```powershell
Properties {
    # Use environment variable or default
    $Configuration = if ($env:BUILD_CONFIG) { $env:BUILD_CONFIG } else { 'Debug' }

    # PowerShell 7+ null-coalescing
    $Version = $env:VERSION ?? '1.0.0'
}
```

### Computed Properties

```powershell
Properties {
    $Configuration = 'Release'
}

Properties {
    # Computed from other properties
    $OutputPath = "./build/$Configuration"
    $PackageName = "myapp-$Version.zip"
}
```

## Common Task Patterns

### Clean Task

```powershell
Task Clean {
    if (Test-Path $OutputPath) {
        Remove-Item $OutputPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}
```

### Restore/Install Dependencies

```powershell
# .NET
Task Restore {
    exec { dotnet restore }
}

# Node.js
Task Install {
    exec { npm install }
}

# Python
Task InstallDeps {
    exec { pip install -r requirements.txt }
}
```

### Build Tasks

```powershell
# .NET Build
Task Build -depends Restore {
    exec { dotnet build --configuration $Configuration --no-restore }
}

# Node.js Build
Task Build -depends Install {
    exec { npm run build }
}

# Go Build
Task Build {
    exec { go build -o ./build/app }
}
```

### Test Tasks

```powershell
# .NET Tests
Task Test -depends Build {
    exec { dotnet test --no-build --no-restore }
}

# With Coverage
Task TestCoverage -depends Build {
    exec { dotnet test --collect:"XPlat Code Coverage" }
}

# Node.js Tests
Task Test {
    exec { npm test }
}
```

### Package/Publish Tasks

```powershell
# Create NuGet Package
Task Pack -depends Build {
    exec { dotnet pack --no-build --output $OutputPath }
}

# Create Zip Archive
Task Package -depends Build {
    Compress-Archive -Path "$OutputPath/*" -DestinationPath "./dist/app.zip"
}

# Publish to Folder
Task Publish -depends Build {
    exec { dotnet publish --configuration $Configuration --output ./publish }
}
```

## Exec Function Patterns

### Basic Execution

```powershell
Task Build {
    exec { dotnet build }
}
```

### Custom Error Message

```powershell
Task Build {
    exec { dotnet build } -errorMessage "Build failed with error"
}
```

### Continue on Error

```powershell
Task Test {
    exec { dotnet test } -continueOnError
}
```

### With Retries

```powershell
Task Deploy {
    exec { ./deploy.ps1 } -maxRetries 3
}
```

### With Retry Pattern Matching

```powershell
Task Deploy {
    exec { ./deploy.ps1 } `
        -maxRetries 3 `
        -retryTriggerErrorPattern "timeout|connection"
}
```

### Working Directory

```powershell
Task BuildSubproject {
    Push-Location ./subproject
    try {
        exec { dotnet build }
    }
    finally {
        Pop-Location
    }
}
```

## Assert Patterns

### File Existence

```powershell
Task Validate {
    Assert (Test-Path './src') "Source directory not found"
    Assert (Test-Path './config.json') "Configuration file missing"
}
```

### Variable Validation

```powershell
Task Deploy {
    Assert (![string]::IsNullOrEmpty($ApiKey)) "API_KEY is required"
    Assert ($Version -match '^\d+\.\d+\.\d+$') "Invalid version format"
}
```

### Condition Checks

```powershell
Task DeployProd {
    Assert ($Environment -eq 'Production') "This task only runs in Production"
    exec { ./deploy.ps1 }
}
```

## Include Patterns

### Include Shared Tasks

```powershell
# In psakefile.ps1
Include ./build/shared-tasks.ps1
Include ./build/deploy-tasks.ps1

Task Default -depends SharedClean, Build, Deploy
```

### Relative Includes

```powershell
Properties {
    $BuildDir = Split-Path $psake.build_script_file
}

Include (Join-Path $BuildDir 'tasks/common.ps1')
```

## Format Task Name Patterns

### Simple Format

```powershell
FormatTaskName {
    param($taskName)
    Write-Host "===== $taskName =====" -ForegroundColor Cyan
}
```

### Detailed Format

```powershell
FormatTaskName {
    param($taskName)
    $line = "-" * 70
    Write-Host $line -ForegroundColor Blue
    Write-Host "  Task: $taskName" -ForegroundColor Yellow
    Write-Host $line -ForegroundColor Blue
}
```

### Timestamp Format

```powershell
FormatTaskName {
    param($taskName)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] Starting task: $taskName" -ForegroundColor Green
}
```

## Parameter Passing

### Via Parameters Hashtable

```powershell
Invoke-psake -parameters @{
    Configuration = 'Release'
    Version = '2.0.0'
    Environment = 'Production'
}
```

### Via Properties (Alternative)

```powershell
Invoke-psake -properties @{
    Configuration = 'Release'
    Version = '2.0.0'
}
```

### Via Environment Variables

```powershell
# Set in shell
$env:BUILD_CONFIG = 'Release'
$env:VERSION = '2.0.0'

# Read in build script
Properties {
    $Configuration = $env:BUILD_CONFIG ?? 'Debug'
    $Version = $env:VERSION ?? '1.0.0'
}

Invoke-psake
```

## Nested Build Patterns

### Sequential Subproject Builds

```powershell
Task BuildAll {
    Invoke-psake ./projects/ProjectA/psakefile.ps1 -taskList Build
    Invoke-psake ./projects/ProjectB/psakefile.ps1 -taskList Build
}
```

### Parallel Subproject Builds

```powershell
Task BuildAll {
    $jobs = @(
        Start-Job { Invoke-psake ./projects/ProjectA/psakefile.ps1 -taskList Build }
        Start-Job { Invoke-psake ./projects/ProjectB/psakefile.ps1 -taskList Build }
    )

    $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
}
```

### Pass Parameters to Nested Build

```powershell
Task BuildSubproject {
    Invoke-psake ./subproject/psakefile.ps1 `
        -taskList Build `
        -parameters @{ Configuration = $Configuration }
}
```

## Common Build Workflows

### Standard .NET Workflow

```powershell
Properties {
    $Configuration = 'Release'
    $OutputPath = './build'
}

Task Default -depends Test

Task Clean {
    Remove-Item $OutputPath -Recurse -Force -ErrorAction SilentlyContinue
}

Task Restore {
    exec { dotnet restore }
}

Task Build -depends Clean, Restore {
    exec { dotnet build --configuration $Configuration --no-restore }
}

Task Test -depends Build {
    exec { dotnet test --configuration $Configuration --no-build }
}

Task Pack -depends Test {
    exec { dotnet pack --configuration $Configuration --no-build --output $OutputPath }
}
```

### Standard Node.js Workflow

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $DistDir = Join-Path $ProjectRoot 'dist'
}

Task Default -depends Test

Task Clean {
    Remove-Item $DistDir -Recurse -Force -ErrorAction SilentlyContinue
}

Task Install {
    exec { npm install }
}

Task Lint -depends Install {
    exec { npm run lint }
}

Task Build -depends Install, Lint {
    exec { npm run build }
}

Task Test -depends Build {
    exec { npm test }
}

Task Package -depends Test {
    exec { npm pack --pack-destination $DistDir }
}
```

### CI/CD Workflow

```powershell
Properties {
    $Configuration = 'Release'
    $Version = $env:VERSION ?? '1.0.0'
    $BuildNumber = $env:BUILD_NUMBER ?? '0'
}

Task CI -depends Clean, Restore, Build, Test, Pack, Publish

Task Clean {
    Remove-Item ./build -Recurse -Force -ErrorAction SilentlyContinue
}

Task Restore {
    exec { dotnet restore }
}

Task Build -depends Restore {
    exec { dotnet build --configuration $Configuration --no-restore }
}

Task Test -depends Build {
    exec { dotnet test --configuration $Configuration --no-build --logger trx }
}

Task Pack -depends Test {
    exec { dotnet pack --configuration $Configuration --no-build -p:Version=$Version }
}

Task Publish -depends Pack {
    exec { dotnet nuget push "./bin/Release/*.nupkg" --api-key $env:NUGET_API_KEY }
}
```

## Error Handling Patterns

### Try-Catch in Tasks

```powershell
Task Deploy {
    try {
        exec { ./deploy.ps1 }
        Write-Host "Deployment successful" -ForegroundColor Green
    }
    catch {
        Write-Host "Deployment failed: $_" -ForegroundColor Red
        throw
    }
}
```

### Graceful Failure

```powershell
Task OptionalTask {
    try {
        exec { ./optional-operation.ps1 }
    }
    catch {
        Write-Warning "Optional operation failed: $_"
        # Continue build
    }
}
```

### Cleanup on Failure

```powershell
Task Deploy {
    try {
        exec { ./deploy.ps1 }
    }
    catch {
        Write-Host "Deployment failed, rolling back..." -ForegroundColor Yellow
        exec { ./rollback.ps1 }
        throw
    }
}
```

## Useful One-Liners

```powershell
# Run psake from any directory with specific build file
Invoke-psake -buildFile C:\projects\myapp\psakefile.ps1

# Run with .NET Framework 4.8
Invoke-psake -framework '4.8'

# List all tasks without running
Invoke-psake -docs

# Run and show task execution time
Invoke-psake -Verbose

# Run specific task in specific file
Invoke-psake -buildFile ./psakefile.ps1 -taskList Deploy -parameters @{Environment='Prod'}

# Check if psake is installed
Get-Module psake -ListAvailable

# Get psake commands
Get-Command -Module psake

# View psake help
Get-Help Invoke-psake -Full

# Run psake and capture output
$result = Invoke-psake -taskList Build 2>&1

# Run psake with specific error action
Invoke-psake -ErrorAction Stop
```

## Environment-Specific Patterns

### Multi-Environment Configuration

```powershell
Properties {
    $Environment = $env:DEPLOY_ENV ?? 'Development'

    $Config = @{
        Development = @{
            ApiUrl = 'http://localhost:5000'
            DbConnection = 'Server=localhost;Database=DevDB'
        }
        Staging = @{
            ApiUrl = 'https://staging.example.com'
            DbConnection = 'Server=staging-db;Database=StagingDB'
        }
        Production = @{
            ApiUrl = 'https://api.example.com'
            DbConnection = 'Server=prod-db;Database=ProdDB'
        }
    }

    $CurrentConfig = $Config[$Environment]
}

Task Deploy {
    Write-Host "Deploying to $Environment" -ForegroundColor Cyan
    Write-Host "  API URL: $($CurrentConfig.ApiUrl)" -ForegroundColor Gray

    exec { ./deploy.ps1 -Environment $Environment -ApiUrl $CurrentConfig.ApiUrl }
}
```

### Environment-Specific Tasks

```powershell
Task DeployDev -precondition { $Environment -eq 'Development' } {
    exec { ./deploy-dev.ps1 }
}

Task DeployStaging -precondition { $Environment -eq 'Staging' } {
    exec { ./deploy-staging.ps1 }
}

Task DeployProd -precondition { $Environment -eq 'Production' } {
    Assert ($Version -ne 'dev') "Cannot deploy dev version to production"
    exec { ./deploy-production.ps1 }
}

Task Deploy -depends DeployDev, DeployStaging, DeployProd {
    # At least one will run based on preconditions
}
```

## Docker Build Patterns

### Build Docker Image

```powershell
Properties {
    $ImageName = 'myapp'
    $ImageTag = $env:VERSION ?? 'latest'
}

Task DockerBuild {
    $fullTag = "${ImageName}:${ImageTag}"
    exec { docker build -t $fullTag . }
}

Task DockerPush -depends DockerBuild {
    $fullTag = "${ImageName}:${ImageTag}"
    exec { docker push $fullTag }
}
```

### Multi-Stage Docker Build

```powershell
Task DockerBuildDev {
    exec { docker build --target development -t myapp:dev . }
}

Task DockerBuildProd {
    exec { docker build --target production -t myapp:prod . }
}
```

## Debugging Tips

```powershell
# Add breakpoints
Set-PSBreakpoint -Script .\psakefile.ps1 -Line 42

# Run with verbose output
Invoke-psake -Verbose

# Add debug output in tasks
Task Build {
    Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
    Write-Host "OutputPath: $OutputPath" -ForegroundColor Yellow
    exec { dotnet build }
}

# Check psake context
Task Debug {
    Write-Host "Build script: $($psake.build_script_file)"
    Write-Host "Version: $($psake.version)"
    Write-Host "Context: $($psake.context | Out-String)"
}

# Test task execution order without running tasks
Invoke-psake -docs  # Shows task dependencies
```

## See Also

- [Glossary](/docs/reference/glossary) - Term definitions
- [Configuration Reference](/docs/reference/configuration-reference) - All configuration options
- [FAQ](/docs/troubleshooting/faq) - Common questions and answers
- [Tasks Tutorial](/docs/tutorial-basics/tasks) - Detailed task documentation
- [Parameters and Properties](/docs/tutorial-basics/parameters-properties) - Parameter handling
