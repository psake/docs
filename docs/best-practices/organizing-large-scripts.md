---
title: "Organizing Large Build Scripts"
description: "Best practices for structuring large psake build scripts using modular tasks, includes, and shared utilities for maintainability"
---

# Organizing Large Build Scripts

As your project grows, build scripts can become complex and difficult to maintain. This guide shows you how to organize large psake builds using modular task files, includes, shared utilities, and clear file structures.

## Quick Start

Here's a basic modular build structure:

```
my-project/
├── build/
│   ├── tasks/
│   │   ├── build.ps1
│   │   ├── test.ps1
│   │   └── deploy.ps1
│   └── utils/
│       └── helpers.ps1
├── psakefile.ps1
└── build.ps1
```

Main `psakefile.ps1`:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
}

# Include paths must be resolved while the build file is loaded.
$tasksDirectory = Join-Path $PSScriptRoot 'build/tasks'
Include (Join-Path $tasksDirectory 'build.ps1')
Include (Join-Path $tasksDirectory 'test.ps1')
Include (Join-Path $tasksDirectory 'deploy.ps1')

Task Default -depends Build, Test
```

## File Structure Patterns

### Pattern 1: Tasks by Category

Organize tasks by functional area:

```
my-project/
├── build/
│   ├── tasks/
│   │   ├── compile.ps1        # Compilation tasks
│   │   ├── test.ps1            # Testing tasks
│   │   ├── package.ps1         # Packaging tasks
│   │   ├── deploy.ps1          # Deployment tasks
│   │   └── cleanup.ps1         # Cleanup tasks
│   ├── utils/
│   │   ├── fileops.ps1         # File operations
│   │   ├── versioning.ps1      # Version management
│   │   └── logging.ps1         # Custom logging
│   └── config/
│       ├── dev.ps1             # Development config
│       ├── staging.ps1         # Staging config
│       └── prod.ps1            # Production config
├── psakefile.ps1               # Main orchestrator
└── build.ps1                   # Bootstrap script
```

**psakefile.ps1:**

```powershell
$buildRoot = Join-Path $PSScriptRoot 'build'
$utilsDirectory = Join-Path $buildRoot 'utils'
$tasksDirectory = Join-Path $buildRoot 'tasks'
$configDirectory = Join-Path $buildRoot 'config'
$selectedEnvironment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }

# Includes are resolved while the build file is loaded.
Include (Join-Path $utilsDirectory 'logging.ps1')
Include (Join-Path $utilsDirectory 'fileops.ps1')
Include (Join-Path $utilsDirectory 'versioning.ps1')
Include (Join-Path $configDirectory "${selectedEnvironment}.ps1")
Include (Join-Path $tasksDirectory 'compile.ps1')
Include (Join-Path $tasksDirectory 'test.ps1')
Include (Join-Path $tasksDirectory 'package.ps1')
Include (Join-Path $tasksDirectory 'deploy.ps1')
Include (Join-Path $tasksDirectory 'cleanup.ps1')

Properties {
    $ProjectRoot = $PSScriptRoot
    $BuildRoot = Join-Path $ProjectRoot 'build'
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $Configuration = 'Release'
}

FormatTaskName {
    param($taskName)
    Write-LogHeader "Executing: $taskName"
}

Task Default -depends Build

Task Build -depends Compile, Test, Package

Task CI -depends Build, Deploy

Task Full -depends Clean, Build, Deploy
```

### Pattern 2: Tasks by Build Type

For projects with multiple build types (library, service, tools):

```
my-project/
├── build/
│   ├── tasks/
│   │   ├── library/
│   │   │   ├── build.ps1
│   │   │   ├── test.ps1
│   │   │   └── publish.ps1
│   │   ├── service/
│   │   │   ├── build.ps1
│   │   │   ├── docker.ps1
│   │   │   └── deploy.ps1
│   │   └── tools/
│   │       ├── build.ps1
│   │       └── package.ps1
│   └── shared/
│       └── common.ps1
└── psakefile.ps1
```

**psakefile.ps1:**

```powershell
$buildRoot = Join-Path $PSScriptRoot 'build'
$buildType = if ($env:BUILD_TYPE) { $env:BUILD_TYPE } else { 'all' }
$buildTasks = @()

Include (Join-Path $buildRoot 'shared/common.ps1')

if ($buildType -in 'library', 'all') {
    Include (Join-Path $buildRoot 'tasks/library/build.ps1')
    Include (Join-Path $buildRoot 'tasks/library/test.ps1')
    Include (Join-Path $buildRoot 'tasks/library/publish.ps1')
    $buildTasks += 'Library:Build'
}

if ($buildType -in 'service', 'all') {
    Include (Join-Path $buildRoot 'tasks/service/build.ps1')
    Include (Join-Path $buildRoot 'tasks/service/docker.ps1')
    Include (Join-Path $buildRoot 'tasks/service/deploy.ps1')
    $buildTasks += 'Service:Build'
}

if ($buildType -in 'tools', 'all') {
    Include (Join-Path $buildRoot 'tasks/tools/build.ps1')
    Include (Join-Path $buildRoot 'tasks/tools/package.ps1')
    $buildTasks += 'Tools:Build'
}

Properties {
    $ProjectRoot = $PSScriptRoot
    $BuildRoot = Join-Path $ProjectRoot 'build'
    $BuildType = if ($env:BUILD_TYPE) { $env:BUILD_TYPE } else { 'all' }
}

Task Default -depends Build
Task Build -depends $buildTasks
```

## Modular Task Files

Break down complex builds into focused, reusable task files.

### Example: Compilation Tasks

**build/tasks/compile.ps1:**

```powershell
Properties {
    # These can reference properties from main psakefile
    $SrcDir = Join-Path $ProjectRoot 'src'
    $BuildDir = Join-Path $ProjectRoot 'build/output'
}

function Invoke-SolutionBuild {
    param([string]$BuildConfiguration)

    $solutionFile = Get-ChildItem "$SrcDir/*.sln" | Select-Object -First 1
    if (-not $solutionFile) { throw "No solution file found in $SrcDir" }

    exec {
        dotnet build $solutionFile.FullName `
            -c $BuildConfiguration `
            -o $BuildDir `
            /p:Version=$Version `
            --no-incremental
    }
}

Task Compile -depends Clean {
    Invoke-SolutionBuild -BuildConfiguration $Configuration
    Write-Host "Compilation complete: $BuildDir" -ForegroundColor Green
}

Task CompileDebug -depends Clean {
    Invoke-SolutionBuild -BuildConfiguration Debug
}

Task CompileRelease -depends Clean {
    Invoke-SolutionBuild -BuildConfiguration Release
}

Task Restore {
    Write-Host "Restoring NuGet packages..." -ForegroundColor Green

    $solutionFile = Get-ChildItem "$SrcDir/*.sln" | Select-Object -First 1
    exec { dotnet restore $solutionFile.FullName }
}

Task Clean {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Green

    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
        Write-Host "  Removed: $BuildDir" -ForegroundColor Gray
    }

    # Clean obj and bin directories
    Get-ChildItem $SrcDir -Include bin,obj -Recurse -Directory | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force
        Write-Host "  Removed: $($_.FullName)" -ForegroundColor Gray
    }
}
```

### Example: Testing Tasks

**build/tasks/test.ps1:**

```powershell
Properties {
    $TestDir = Join-Path $ProjectRoot 'tests'
    $TestResultsDir = Join-Path $ProjectRoot 'TestResults'
    $CoverageThreshold = 80
}

Task Test -depends Compile {
    Write-Host "Running unit tests..." -ForegroundColor Green

    if (-not (Test-Path $TestDir)) {
        Write-Warning "No tests directory found at $TestDir"
        return
    }

    exec {
        dotnet test $TestDir `
            --configuration $Configuration `
            --no-build `
            --logger "trx;LogFileName=test-results.trx" `
            --results-directory $TestResultsDir
    }
}

Task TestWithCoverage -depends Compile {
    Write-Host "Running tests with coverage..." -ForegroundColor Green

    exec {
        dotnet test $TestDir `
            --configuration $Configuration `
            --no-build `
            --collect:"XPlat Code Coverage" `
            --results-directory $TestResultsDir
    }

    # Check coverage threshold
    $coverageFile = Get-ChildItem "$TestResultsDir/**/coverage.cobertura.xml" -Recurse | Select-Object -First 1

    if ($coverageFile) {
        [xml]$coverage = Get-Content $coverageFile.FullName -Raw
        $lineRate = [double]$coverage.coverage.'line-rate' * 100

        Write-Host "Code coverage: ${lineRate}%" -ForegroundColor Cyan

        if ($lineRate -lt $CoverageThreshold) {
            throw "Coverage ${lineRate}% is below threshold ${CoverageThreshold}%"
        }
    }
}

Task TestUnit {
    exec {
        dotnet test $TestDir `
            --filter "Category=Unit" `
            --configuration $Configuration
    }
}

Task TestIntegration -depends Build {
    exec {
        dotnet test $TestDir `
            --filter "Category=Integration" `
            --configuration $Configuration
    }
}
```

### Example: Deployment Tasks

**build/tasks/deploy.ps1:**

```powershell
$deployTaskByTarget = @{
    azure = 'Deploy:Azure'
    aws = 'Deploy:AWS'
    local = 'Deploy:Local'
}
$selectedDeployTarget = if ($env:DEPLOY_TARGET) { $env:DEPLOY_TARGET } else { 'local' }
if (-not $deployTaskByTarget.ContainsKey($selectedDeployTarget)) {
    throw "Unknown deployment target: $selectedDeployTarget"
}

Properties {
    $DeployTarget = if ($env:DEPLOY_TARGET) { $env:DEPLOY_TARGET } else { 'local' }
    $DeploymentDir = Join-Path $ProjectRoot 'deployment'
    $AwsDeploymentBucket = $env:AWS_DEPLOYMENT_BUCKET
    $AwsApplicationName = $env:AWS_APPLICATION_NAME
    $AwsDeploymentGroup = $env:AWS_DEPLOYMENT_GROUP
}

Task Deploy -depends $deployTaskByTarget[$selectedDeployTarget]

Task Deploy:Azure {
    $packageFile = Get-ChildItem "$BuildDir/*.zip" | Select-Object -First 1
    if (-not $packageFile) { throw "Deployment package not found in $BuildDir" }

    exec {
        az webapp deploy `
            --resource-group $AzureResourceGroup `
            --name $AzureWebAppName `
            --src-path $packageFile.FullName `
            --type zip
    }
}

Task Deploy:AWS {
    $packageFile = Get-ChildItem "$BuildDir/*.zip" | Select-Object -First 1
    if (-not $packageFile) { throw "Deployment package not found in $BuildDir" }

    exec { aws s3 cp $packageFile.FullName "s3://$AwsDeploymentBucket/$($packageFile.Name)" }
    exec {
        aws deploy create-deployment `
            --application-name $AwsApplicationName `
            --deployment-group-name $AwsDeploymentGroup `
            --s3-location "bucket=$AwsDeploymentBucket,key=$($packageFile.Name),bundleType=zip"
    }
}

Task Deploy:Local {
    Write-Host "Deploying to local environment..." -ForegroundColor Green

    $targetDir = Join-Path $DeploymentDir $Environment

    if (Test-Path $targetDir) {
        Remove-Item $targetDir -Recurse -Force
    }

    Copy-Item $BuildDir -Destination $targetDir -Recurse

    Write-Host "Deployed to: $targetDir" -ForegroundColor Green
}
```

## Using Include Effectively

The `Include` function allows you to split build logic across multiple files.

### Include with Path Validation

```powershell
$buildRoot = Join-Path $PSScriptRoot 'build'

function Include-TaskFile {
    param([string]$RelativePath)

    $fullPath = Join-Path $buildRoot $RelativePath
    if (-not (Test-Path $fullPath)) {
        throw "Task file not found: $fullPath"
    }
    Include $fullPath
}

Include-TaskFile 'tasks/build.ps1'
Include-TaskFile 'tasks/test.ps1'
Include-TaskFile 'tasks/deploy.ps1'
```

### Dynamic Includes Based on Configuration

```powershell
$projectType = if ($env:PROJECT_TYPE) { $env:PROJECT_TYPE } else { 'dotnet' }
$tasksDirectory = Join-Path $PSScriptRoot 'build/tasks'

Include (Join-Path $tasksDirectory 'common.ps1')

$projectTaskFile = Join-Path $tasksDirectory "${projectType}.ps1"
if (-not (Test-Path $projectTaskFile)) {
    throw "No task file found for project type: $projectType"
}
Include $projectTaskFile

$optionalTasks = @('docker.ps1', 'kubernetes.ps1', 'terraform.ps1')
foreach ($taskFile in $optionalTasks) {
    $fullPath = Join-Path $tasksDirectory $taskFile
    if (Test-Path $fullPath) {
        Write-Host "Loading optional tasks: $taskFile" -ForegroundColor Gray
        Include $fullPath
    }
}
```

### Include Order Matters

```powershell
# 1. Include utilities first (they define helper functions)
Include (Join-Path $BuildRoot 'utils/logging.ps1')
Include (Join-Path $BuildRoot 'utils/helpers.ps1')

# 2. Include configuration (depends on utilities)
Include (Join-Path $BuildRoot 'config/settings.ps1')

# 3. Include tasks (depend on utilities and config)
Include (Join-Path $BuildRoot 'tasks/build.ps1')
Include (Join-Path $BuildRoot 'tasks/test.ps1')
Include (Join-Path $BuildRoot 'tasks/deploy.ps1')
```

## Shared Utilities

Create reusable utility functions that can be shared across all task files.

### Example: File Operations Utility

**build/utils/fileops.ps1:**

```powershell
# File operation utilities

function Remove-DirectorySafe {
    param(
        [string]$Path,
        [switch]$Quiet
    )

    if (Test-Path $Path) {
        Remove-Item $Path -Recurse -Force
        if (-not $Quiet) {
            Write-Host "  Removed: $Path" -ForegroundColor Gray
        }
        return $true
    }
    return $false
}

function New-DirectorySafe {
    param(
        [string]$Path,
        [switch]$Quiet
    )

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        if (-not $Quiet) {
            Write-Host "  Created: $Path" -ForegroundColor Gray
        }
        return $true
    }
    return $false
}

function Copy-DirectoryContents {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$Exclude = @()
    )

    if (-not (Test-Path $Source)) {
        throw "Source directory not found: $Source"
    }

    New-DirectorySafe -Path $Destination -Quiet

    $items = Get-ChildItem $Source -Recurse

    foreach ($item in $items) {
        $skip = $false
        foreach ($pattern in $Exclude) {
            if ($item.FullName -like "*$pattern*") {
                $skip = $true
                break
            }
        }

        if ($skip) { continue }

        $relativePath = $item.FullName.Substring($Source.Length)
        $targetPath = Join-Path $Destination $relativePath

        if ($item.PSIsContainer) {
            New-DirectorySafe -Path $targetPath -Quiet
        } else {
            Copy-Item $item.FullName -Destination $targetPath -Force
        }
    }
}

function Get-FileHash256 {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        throw "File not found: $FilePath"
    }

    return (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash
}

```

### Example: Logging Utility

**build/utils/logging.ps1:**

```powershell
# Logging utilities

function Write-LogHeader {
    param([string]$Message)

    $separator = "=" * 80
    Write-Host $separator -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host $separator -ForegroundColor Cyan
}

function Write-LogSection {
    param([string]$Message)

    Write-Host ""
    Write-Host ">>> $Message" -ForegroundColor Green
}

function Write-LogInfo {
    param([string]$Message)

    Write-Host "  [INFO] $Message" -ForegroundColor Gray
}

function Write-LogSuccess {
    param([string]$Message)

    Write-Host "  [SUCCESS] $Message" -ForegroundColor Green
}

function Write-LogWarning {
    param([string]$Message)

    Write-Host "  [WARNING] $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)

    Write-Host "  [ERROR] $Message" -ForegroundColor Red
}

function Write-LogStep {
    param(
        [int]$Step,
        [int]$Total,
        [string]$Message
    )

    Write-Host "  [$Step/$Total] $Message" -ForegroundColor Cyan
}

```

### Example: Versioning Utility

**build/utils/versioning.ps1:**

```powershell
# Version management utilities


function Get-BuildVersion {
    param(
        [string]$BaseVersion = '1.0.0',
        [string]$BuildNumber = $null
    )

    if ([string]::IsNullOrEmpty($BuildNumber)) {
        $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { '0' }
    }

    if ($BaseVersion -notmatch '^\d+\.\d+\.\d+$') {
        throw "Base version is not valid SemVer: $BaseVersion"
    }

    return "$BaseVersion-ci.$BuildNumber"
}

function Set-AssemblyVersion {
    param(
        [string]$ProjectFile,
        [string]$Version
    )

    if (-not (Test-Path $ProjectFile)) {
        throw "Project file not found: $ProjectFile"
    }

    [xml]$project = Get-Content $ProjectFile -Raw

    $propertyGroup = $project.Project.PropertyGroup | Select-Object -First 1

    if ($null -eq $propertyGroup.Version) {
        $versionNode = $project.CreateElement("Version")
        $propertyGroup.AppendChild($versionNode) | Out-Null
    }

    $propertyGroup.Version = $Version

    $project.Save($ProjectFile)

    Write-Host "Updated version to $Version in $ProjectFile" -ForegroundColor Green
}

```

## Complete Example: Large Project

Here's a complete example combining all patterns:

**psakefile.ps1:**

```powershell
$buildRoot = Join-Path $PSScriptRoot 'build'
$selectedEnvironment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }

Include (Join-Path $buildRoot 'utils/logging.ps1')
Include (Join-Path $buildRoot 'utils/fileops.ps1')
Include (Join-Path $buildRoot 'utils/versioning.ps1')

$environmentConfig = Join-Path $buildRoot "config/${selectedEnvironment}.ps1"
if (-not (Test-Path $environmentConfig)) {
    throw "Environment configuration not found: $environmentConfig"
}
Include $environmentConfig

Include (Join-Path $buildRoot 'tasks/compile.ps1')
Include (Join-Path $buildRoot 'tasks/test.ps1')
Include (Join-Path $buildRoot 'tasks/package.ps1')
Include (Join-Path $buildRoot 'tasks/deploy.ps1')
Include (Join-Path $buildRoot 'tasks/cleanup.ps1')

Properties {
    $ProjectRoot = $PSScriptRoot
    $BuildRoot = Join-Path $ProjectRoot 'build'
    $SrcDir = Join-Path $ProjectRoot 'src'
    $TestDir = Join-Path $ProjectRoot 'tests'
    $BuildDir = Join-Path $ProjectRoot 'build/output'
    $Configuration = if ($env:BUILD_CONFIGURATION) { $env:BUILD_CONFIGURATION } else { 'Debug' }
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { '0' }
    $Version = Get-BuildVersion -BaseVersion '1.0.0' -BuildNumber $BuildNumber
}

# Custom task formatter
FormatTaskName {
    param($taskName)
    Write-LogHeader "Task: $taskName"
}

# Main orchestration tasks
Task Default -depends Build

Task Build -depends Restore, Compile, Test {
    Write-LogSuccess "Build completed successfully"
}

Task CI -depends Build, Package {
    Write-LogSuccess "CI build completed"
}

Task Release -depends Clean, Build, Package, Deploy {
    Write-LogSuccess "Release completed"
}

Task Full -depends Clean, Restore, Compile, TestWithCoverage, Package, Deploy {
    Write-LogSuccess "Full build and deployment completed"
}
```

The environment and utility files are the complete implementations shown earlier in this guide. Add these remaining task files:

**build/tasks/package.ps1:**

```powershell
Task Package -depends Build {
    if (-not (Test-Path $BuildDir)) {
        throw "Build output not found: $BuildDir"
    }

    $packagePath = Join-Path $BuildRoot "MyApp-$Version.zip"
    Compress-Archive -Path "$BuildDir/*" -DestinationPath $packagePath -Force
    Write-LogSuccess "Created $packagePath"
}
```

**build/tasks/cleanup.ps1:**

```powershell
Task Clean {
    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
}
```

Use the `compile.ps1`, `test.ps1`, and `deploy.ps1` implementations from the modular task-file examples above. Together, these files satisfy every `Include` in the orchestrator.

## Best Practices Summary

1. **Use a clear directory structure** - Organize by category or build type
2. **Keep task files focused** - One responsibility per file
3. **Load utilities before tasks** - Ensure dependencies are available
4. **Use Include for modularization** - Split large builds into manageable pieces
5. **Create shared utilities** - Avoid duplicating code across task files
6. **Validate file paths** - Check that included files exist
7. **Use meaningful names** - Make task files and functions self-documenting
8. **Document complex logic** - Add comments explaining non-obvious decisions
9. **Keep the main psakefile simple** - It should orchestrate, not implement
10. **Test modular components** - Ensure each task file works independently

## See Also

- [Access Functions in Another File](/docs/tutorial-advanced/access-functions-in-another-file) - Using Include and dot-sourcing
- [Structure of a psake Build Script](/docs/tutorial-advanced/structure-of-a-psake-build-script) - Basic script structure
- [Environment Management](/docs/best-practices/environment-management) - Managing multiple environments
- [Testing Build Scripts](/docs/best-practices/testing-build-scripts) - Testing your psake scripts
- [.NET Solution Builds](/docs/build-types/dot-net-solution) - Complete .NET examples
