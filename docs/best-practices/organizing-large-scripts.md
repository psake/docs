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
    $TasksDir = Join-Path $ProjectRoot 'build/tasks'
}

# Include modular task files
Include (Join-Path $TasksDir 'build.ps1')
Include (Join-Path $TasksDir 'test.ps1')
Include (Join-Path $TasksDir 'deploy.ps1')

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
Properties {
    $ProjectRoot = $PSScriptRoot
    $BuildRoot = Join-Path $ProjectRoot 'build'
    $TasksDir = Join-Path $BuildRoot 'tasks'
    $UtilsDir = Join-Path $BuildRoot 'utils'
    $ConfigDir = Join-Path $BuildRoot 'config'

    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $Configuration = 'Release'
}

# Load utilities first (order matters)
Include (Join-Path $UtilsDir 'logging.ps1')
Include (Join-Path $UtilsDir 'fileops.ps1')
Include (Join-Path $UtilsDir 'versioning.ps1')

# Load environment-specific configuration
Include (Join-Path $ConfigDir "${Environment}.ps1")

# Load task modules
Include (Join-Path $TasksDir 'compile.ps1')
Include (Join-Path $TasksDir 'test.ps1')
Include (Join-Path $TasksDir 'package.ps1')
Include (Join-Path $TasksDir 'deploy.ps1')
Include (Join-Path $TasksDir 'cleanup.ps1')

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
Properties {
    $ProjectRoot = $PSScriptRoot
    $BuildRoot = Join-Path $ProjectRoot 'build'
    $BuildType = 'all'  # Options: library, service, tools, all
}

# Load shared utilities
Include (Join-Path $BuildRoot 'shared/common.ps1')

# Conditionally load build type tasks
if ($BuildType -eq 'library' -or $BuildType -eq 'all') {
    Include (Join-Path $BuildRoot 'tasks/library/build.ps1')
    Include (Join-Path $BuildRoot 'tasks/library/test.ps1')
    Include (Join-Path $BuildRoot 'tasks/library/publish.ps1')
}

if ($BuildType -eq 'service' -or $BuildType -eq 'all') {
    Include (Join-Path $BuildRoot 'tasks/service/build.ps1')
    Include (Join-Path $BuildRoot 'tasks/service/docker.ps1')
    Include (Join-Path $BuildRoot 'tasks/service/deploy.ps1')
}

if ($BuildType -eq 'tools' -or $BuildType -eq 'all') {
    Include (Join-Path $BuildRoot 'tasks/tools/build.ps1')
    Include (Join-Path $BuildRoot 'tasks/tools/package.ps1')
}

Task Default -depends Build

Task Build {
    if ($BuildType -eq 'library' -or $BuildType -eq 'all') {
        Invoke-psake -taskList Library:Build
    }
    if ($BuildType -eq 'service' -or $BuildType -eq 'all') {
        Invoke-psake -taskList Service:Build
    }
    if ($BuildType -eq 'tools' -or $BuildType -eq 'all') {
        Invoke-psake -taskList Tools:Build
    }
}
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

Task Compile -depends Clean {
    Write-Host "Compiling solution..." -ForegroundColor Green

    $solutionFile = Get-ChildItem "$SrcDir/*.sln" | Select-Object -First 1

    if (-not $solutionFile) {
        throw "No solution file found in $SrcDir"
    }

    exec {
        dotnet build $solutionFile.FullName `
            -c $Configuration `
            -o $BuildDir `
            /p:Version=$Version `
            --no-incremental
    }

    Write-Host "Compilation complete: $BuildDir" -ForegroundColor Green
}

Task CompileDebug {
    $script:Configuration = 'Debug'
    Invoke-psake -taskList Compile
}

Task CompileRelease {
    $script:Configuration = 'Release'
    Invoke-psake -taskList Compile
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
        [xml]$coverage = Get-Content $coverageFile.FullName
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
Properties {
    $DeployTarget = if ($env:DEPLOY_TARGET) { $env:DEPLOY_TARGET } else { 'dev' }
    $DeploymentDir = Join-Path $ProjectRoot 'deployment'
}

Task Deploy -depends Package -precondition { $Environment -ne 'dev' } {
    Write-Host "Deploying to $DeployTarget..." -ForegroundColor Green

    switch ($DeployTarget) {
        'azure' { Invoke-psake -taskList Deploy:Azure }
        'aws' { Invoke-psake -taskList Deploy:AWS }
        'local' { Invoke-psake -taskList Deploy:Local }
        default { throw "Unknown deploy target: $DeployTarget" }
    }
}

Task Deploy:Azure {
    Write-Host "Deploying to Azure..." -ForegroundColor Green

    $webAppName = $AzureWebAppName
    $resourceGroup = $AzureResourceGroup

    if ([string]::IsNullOrEmpty($webAppName) -or [string]::IsNullOrEmpty($resourceGroup)) {
        throw "Azure configuration is incomplete"
    }

    $packageFile = Get-ChildItem "$BuildDir/*.zip" | Select-Object -First 1

    exec {
        az webapp deployment source config-zip `
            --resource-group $resourceGroup `
            --name $webAppName `
            --src $packageFile.FullName
    }

    Write-Host "Deployed to Azure: https://${webAppName}.azurewebsites.net" -ForegroundColor Green
}

Task Deploy:AWS {
    Write-Host "Deploying to AWS..." -ForegroundColor Green

    # AWS deployment logic here
    throw "AWS deployment not yet implemented"
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
Properties {
    $BuildRoot = Join-Path $PSScriptRoot 'build'
}

# Helper function to safely include files
function Include-TaskFile {
    param([string]$RelativePath)

    $fullPath = Join-Path $BuildRoot $RelativePath

    if (-not (Test-Path $fullPath)) {
        throw "Task file not found: $fullPath"
    }

    Include $fullPath
}

# Include task files with validation
Include-TaskFile 'tasks/build.ps1'
Include-TaskFile 'tasks/test.ps1'
Include-TaskFile 'tasks/deploy.ps1'
```

### Dynamic Includes Based on Configuration

```powershell
Properties {
    $ProjectType = 'dotnet'  # Options: dotnet, nodejs, docker
    $TasksDir = Join-Path $PSScriptRoot 'build/tasks'
}

# Include common tasks
Include (Join-Path $TasksDir 'common.ps1')

# Include project-type specific tasks
$projectTaskFile = Join-Path $TasksDir "${ProjectType}.ps1"
if (Test-Path $projectTaskFile) {
    Include $projectTaskFile
} else {
    throw "No task file found for project type: $ProjectType"
}

# Include optional tasks if they exist
$optionalTasks = @('docker.ps1', 'kubernetes.ps1', 'terraform.ps1')
foreach ($taskFile in $optionalTasks) {
    $fullPath = Join-Path $TasksDir $taskFile
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

# Export utilities (make them available to other scripts)
Export-ModuleMember -Function @(
    'Remove-DirectorySafe',
    'New-DirectorySafe',
    'Copy-DirectoryContents',
    'Get-FileHash256'
)
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

# Export utilities
Export-ModuleMember -Function @(
    'Write-LogHeader',
    'Write-LogSection',
    'Write-LogInfo',
    'Write-LogSuccess',
    'Write-LogWarning',
    'Write-LogError',
    'Write-LogStep'
)
```

### Example: Versioning Utility

**build/utils/versioning.ps1:**

```powershell
# Version management utilities

function Get-GitVersion {
    <#
    .SYNOPSIS
    Gets version information from git tags and commits
    #>

    try {
        # Get latest tag
        $tag = git describe --tags --abbrev=0 2>$null

        if ([string]::IsNullOrEmpty($tag)) {
            return "1.0.0"
        }

        # Parse semantic version
        if ($tag -match '^v?(\d+)\.(\d+)\.(\d+)') {
            $major = $matches[1]
            $minor = $matches[2]
            $patch = $matches[3]

            # Get commits since tag
            $commitsSinceTag = git rev-list "$tag..HEAD" --count 2>$null

            if ($commitsSinceTag -gt 0) {
                # Bump patch version
                $patch = [int]$patch + 1
                return "$major.$minor.$patch-dev.$commitsSinceTag"
            }

            return "$major.$minor.$patch"
        }

        return "1.0.0"
    }
    catch {
        Write-Warning "Failed to get git version: $_"
        return "1.0.0"
    }
}

function Get-BuildVersion {
    param(
        [string]$BaseVersion = "1.0.0",
        [string]$BuildNumber = $null
    )

    if ([string]::IsNullOrEmpty($BuildNumber)) {
        $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { "0" }
    }

    if ($BaseVersion -match '^(\d+)\.(\d+)\.(\d+)') {
        $major = $matches[1]
        $minor = $matches[2]
        return "$major.$minor.$BuildNumber"
    }

    return "$BaseVersion.$BuildNumber"
}

function Set-AssemblyVersion {
    param(
        [string]$ProjectFile,
        [string]$Version
    )

    if (-not (Test-Path $ProjectFile)) {
        throw "Project file not found: $ProjectFile"
    }

    [xml]$project = Get-Content $ProjectFile

    $propertyGroup = $project.Project.PropertyGroup | Select-Object -First 1

    if ($null -eq $propertyGroup.Version) {
        $versionNode = $project.CreateElement("Version")
        $propertyGroup.AppendChild($versionNode) | Out-Null
    }

    $propertyGroup.Version = $Version

    $project.Save($ProjectFile)

    Write-Host "Updated version to $Version in $ProjectFile" -ForegroundColor Green
}

Export-ModuleMember -Function @(
    'Get-GitVersion',
    'Get-BuildVersion',
    'Set-AssemblyVersion'
)
```

## Complete Example: Large Project

Here's a complete example combining all patterns:

**psakefile.ps1:**

```powershell
Properties {
    # Base paths
    $ProjectRoot = $PSScriptRoot
    $BuildRoot = Join-Path $ProjectRoot 'build'
    $SrcDir = Join-Path $ProjectRoot 'src'
    $TestDir = Join-Path $ProjectRoot 'tests'
    $BuildDir = Join-Path $ProjectRoot 'build/output'

    # Configuration
    $Configuration = if ($env:BUILD_CONFIGURATION) { $env:BUILD_CONFIGURATION } else { 'Debug' }
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }

    # Versioning
    $Version = Get-GitVersion
    $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { '0' }
}

# Load utilities (order matters!)
Include (Join-Path $BuildRoot 'utils/logging.ps1')
Include (Join-Path $BuildRoot 'utils/fileops.ps1')
Include (Join-Path $BuildRoot 'utils/versioning.ps1')

# Load environment configuration
$envConfig = Join-Path $BuildRoot "config/${Environment}.ps1"
if (Test-Path $envConfig) {
    Include $envConfig
}

# Load task modules
Include (Join-Path $BuildRoot 'tasks/compile.ps1')
Include (Join-Path $BuildRoot 'tasks/test.ps1')
Include (Join-Path $BuildRoot 'tasks/package.ps1')
Include (Join-Path $BuildRoot 'tasks/deploy.ps1')
Include (Join-Path $BuildRoot 'tasks/cleanup.ps1')

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
