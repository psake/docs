---
title: "Build Versioning Strategies"
description: "Implement effective build versioning using semantic versioning, git-based versioning, CI build numbers, and automated assembly version updates"
---

# Build Versioning Strategies

Proper version management ensures traceability, reproducibility, and clear release history. This guide shows you how to implement versioning strategies in psake using semantic versioning, git tags, CI build numbers, and automated assembly updates.

## Quick Start

Here's a basic versioning setup using git tags and build numbers:

```powershell
Properties {
    # Base version from git tag
    $BaseVersion = Get-GitVersion
    $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { '0' }

    # Construct full version
    $Version = "$BaseVersion.$BuildNumber"
}

function Get-GitVersion {
    try {
        $tag = git describe --tags --abbrev=0 2>$null
        if ($tag -match '^v?(\d+\.\d+\.\d+)') {
            return $matches[1]
        }
    }
    catch { }

    return '1.0.0'
}

Task Build {
    Write-Host "Building version: $Version" -ForegroundColor Cyan

    exec {
        dotnet build -c Release /p:Version=$Version
    }
}
```

## Semantic Versioning (SemVer)

Semantic versioning (MAJOR.MINOR.PATCH) is the industry standard:

- **MAJOR** - Breaking changes (incompatible API changes)
- **MINOR** - New features (backward-compatible functionality)
- **PATCH** - Bug fixes (backward-compatible bug fixes)

### Manual Semantic Versioning

```powershell
Properties {
    # Manually maintained version
    $MajorVersion = 1
    $MinorVersion = 5
    $PatchVersion = 2

    # CI build number
    $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { '0' }

    # Construct versions
    $SemanticVersion = "$MajorVersion.$MinorVersion.$PatchVersion"
    $AssemblyVersion = "$MajorVersion.$MinorVersion.0.0"
    $FileVersion = "$MajorVersion.$MinorVersion.$PatchVersion.$BuildNumber"
    $InformationalVersion = "$SemanticVersion+build.$BuildNumber"
}

Task ShowVersion {
    Write-Host "Version Information:" -ForegroundColor Cyan
    Write-Host "  Semantic Version:      $SemanticVersion" -ForegroundColor Gray
    Write-Host "  Assembly Version:      $AssemblyVersion" -ForegroundColor Gray
    Write-Host "  File Version:          $FileVersion" -ForegroundColor Gray
    Write-Host "  Informational Version: $InformationalVersion" -ForegroundColor Gray
}

Task Build {
    exec {
        dotnet build `
            /p:Version=$SemanticVersion `
            /p:AssemblyVersion=$AssemblyVersion `
            /p:FileVersion=$FileVersion `
            /p:InformationalVersion=$InformationalVersion
    }
}
```

### Pre-release Versions

```powershell
Properties {
    $MajorVersion = 2
    $MinorVersion = 0
    $PatchVersion = 0
    $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { '0' }

    # Determine pre-release label
    $Branch = if ($env:BRANCH_NAME) { $env:BRANCH_NAME } else { 'develop' }

    $PreReleaseLabel = switch -Regex ($Branch) {
        '^main$|^master$' { '' }           # Production release
        '^release/.*'     { 'rc' }         # Release candidate
        '^develop$'       { 'beta' }       # Beta release
        '^feature/.*'     { 'alpha' }      # Alpha release
        default           { 'dev' }        # Development build
    }

    # Construct version
    if ([string]::IsNullOrEmpty($PreReleaseLabel)) {
        $Version = "$MajorVersion.$MinorVersion.$PatchVersion"
    } else {
        $Version = "$MajorVersion.$MinorVersion.$PatchVersion-$PreReleaseLabel.$BuildNumber"
    }
}

Task Build {
    Write-Host "Building version: $Version" -ForegroundColor Cyan
    Write-Host "  Branch: $Branch" -ForegroundColor Gray
    Write-Host "  Pre-release: $PreReleaseLabel" -ForegroundColor Gray

    exec {
        dotnet build `
            -c Release `
            /p:Version=$Version `
            /p:VersionPrefix="$MajorVersion.$MinorVersion.$PatchVersion" `
            /p:VersionSuffix=$PreReleaseLabel
    }
}
```

## Git-Based Versioning

Derive versions from git tags and commit history:

### Using Git Tags

```powershell
function Get-GitVersion {
    <#
    .SYNOPSIS
    Gets version from git tags
    #>

    try {
        # Get the latest tag
        $latestTag = git describe --tags --abbrev=0 2>$null

        if ([string]::IsNullOrEmpty($latestTag)) {
            Write-Warning "No git tags found, using default version"
            return '0.1.0'
        }

        # Parse version from tag (handles v1.0.0 or 1.0.0)
        if ($latestTag -match '^v?(\d+)\.(\d+)\.(\d+)') {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            $patch = [int]$matches[3]

            # Get commits since tag
            $commitsSinceTag = git rev-list "$latestTag..HEAD" --count 2>$null

            if ($commitsSinceTag -gt 0) {
                # Bump patch for commits since last tag
                $patch++
                return "$major.$minor.$patch-dev.$commitsSinceTag"
            }

            return "$major.$minor.$patch"
        }

        Write-Warning "Tag format not recognized: $latestTag"
        return '0.1.0'
    }
    catch {
        Write-Warning "Error getting git version: $_"
        return '0.1.0'
    }
}

Properties {
    $GitVersion = Get-GitVersion
    $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { '0' }
    $Version = $GitVersion
}

Task Build {
    Write-Host "Git-based version: $Version" -ForegroundColor Cyan

    exec {
        dotnet build -c Release /p:Version=$Version
    }
}

Task CreateTag {
    param(
        [string]$TagVersion = '1.0.0',
        [string]$Message = 'Release'
    )

    Write-Host "Creating git tag: v$TagVersion" -ForegroundColor Green

    # Validate version format
    if ($TagVersion -notmatch '^\d+\.\d+\.\d+$') {
        throw "Invalid version format: $TagVersion (expected: MAJOR.MINOR.PATCH)"
    }

    # Create annotated tag
    exec { git tag -a "v$TagVersion" -m $Message }

    Write-Host "Tag created successfully. Push with: git push origin v$TagVersion" -ForegroundColor Yellow
}
```

### Using GitVersion Tool

```powershell
Properties {
    $GitVersionExe = 'gitversion'
}

Task InstallGitVersion {
    Write-Host "Installing GitVersion..." -ForegroundColor Green

    exec { dotnet tool install --global GitVersion.Tool }
}

Task GetGitVersion {
    Write-Host "Calculating version with GitVersion..." -ForegroundColor Green

    # Run GitVersion and parse output
    $versionJson = & $GitVersionExe | ConvertFrom-Json

    # Extract version components
    $script:Version = $versionJson.SemVer
    $script:MajorMinorPatch = $versionJson.MajorMinorPatch
    $script:InformationalVersion = $versionJson.InformationalVersion
    $script:AssemblyVersion = $versionJson.AssemblySemVer
    $script:FileVersion = $versionJson.AssemblySemFileVer
    $script:NuGetVersion = $versionJson.NuGetVersionV2

    Write-Host "  SemVer: $Version" -ForegroundColor Cyan
    Write-Host "  NuGet: $NuGetVersion" -ForegroundColor Gray
    Write-Host "  Assembly: $AssemblyVersion" -ForegroundColor Gray
}

Task Build -depends GetGitVersion {
    exec {
        dotnet build `
            /p:Version=$NuGetVersion `
            /p:AssemblyVersion=$AssemblyVersion `
            /p:FileVersion=$FileVersion `
            /p:InformationalVersion=$InformationalVersion
    }
}
```

**GitVersion.yml:**

```yaml
mode: Mainline
branches:
  main:
    tag: ''
  develop:
    tag: 'beta'
  feature:
    tag: 'alpha.{BranchName}'
  release:
    tag: 'rc'
  hotfix:
    tag: 'hotfix'
ignore:
  sha: []
```

## CI Build Number Versioning

Leverage CI/CD build numbers:

### GitHub Actions

```powershell
Properties {
    $BaseVersion = '1.0.0'
    $BuildNumber = if ($env:GITHUB_RUN_NUMBER) { $env:GITHUB_RUN_NUMBER } else { '0' }
    $GitSha = if ($env:GITHUB_SHA) { $env:GITHUB_SHA.Substring(0, 7) } else { 'local' }

    # Construct version
    $Version = "$BaseVersion.$BuildNumber"
    $InformationalVersion = "$Version+$GitSha"
}

Task Build {
    Write-Host "Building version $Version" -ForegroundColor Cyan
    Write-Host "  Build: $BuildNumber" -ForegroundColor Gray
    Write-Host "  Commit: $GitSha" -ForegroundColor Gray

    exec {
        dotnet build `
            /p:Version=$Version `
            /p:InformationalVersion=$InformationalVersion
    }
}
```

**.github/workflows/build.yml:**

```yaml
name: Build

on: [push]

jobs:
  build:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Get full history for versioning

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Force

      - name: Build
        shell: pwsh
        run: |
          Invoke-psake -buildFile .\psakefile.ps1 -taskList Build
        env:
          GITHUB_RUN_NUMBER: ${{ github.run_number }}
          GITHUB_SHA: ${{ github.sha }}
```

### Azure Pipelines

```powershell
Properties {
    $BaseVersion = '1.0.0'
    $BuildNumber = if ($env:BUILD_BUILDNUMBER) { $env:BUILD_BUILDNUMBER } else { '0' }
    $Version = "$BaseVersion.$BuildNumber"
}

Task Build {
    Write-Host "Building version $Version" -ForegroundColor Cyan

    # Update Azure Pipelines build number
    if ($env:BUILD_BUILDNUMBER) {
        Write-Host "##vso[build.updatebuildnumber]$Version"
    }

    exec {
        dotnet build /p:Version=$Version
    }
}
```

**azure-pipelines.yml:**

```yaml
trigger:
  - main

pool:
  vmImage: 'windows-latest'

name: '1.0.$(Rev:r)'

steps:
  - task: PowerShell@2
    displayName: 'Build'
    inputs:
      targetType: 'inline'
      script: |
        Install-Module -Name psake -Force
        Invoke-psake -buildFile .\psakefile.ps1 -taskList Build
```

## Assembly Version Updates

Automatically update project file versions:

### Updating .NET Project Files

```powershell
function Update-ProjectVersion {
    param(
        [string]$ProjectFile,
        [string]$Version
    )

    if (-not (Test-Path $ProjectFile)) {
        throw "Project file not found: $ProjectFile"
    }

    Write-Host "Updating version in $ProjectFile to $Version" -ForegroundColor Green

    # Load project file
    [xml]$project = Get-Content $ProjectFile

    # Find or create PropertyGroup
    $propertyGroup = $project.Project.PropertyGroup | Select-Object -First 1

    if ($null -eq $propertyGroup) {
        $propertyGroup = $project.CreateElement('PropertyGroup')
        $project.Project.AppendChild($propertyGroup) | Out-Null
    }

    # Update or create version properties
    $versionProperties = @(
        'Version',
        'AssemblyVersion',
        'FileVersion'
    )

    foreach ($propName in $versionProperties) {
        if ($null -eq $propertyGroup.$propName) {
            $propNode = $project.CreateElement($propName)
            $propertyGroup.AppendChild($propNode) | Out-Null
        }
        $propertyGroup.$propName = $Version
    }

    # Save updated project file
    $project.Save($ProjectFile)

    Write-Host "  Version updated to: $Version" -ForegroundColor Gray
}

Task UpdateProjectVersions {
    Write-Host "Updating project versions..." -ForegroundColor Green

    $projects = Get-ChildItem "$SrcDir/**/*.csproj" -Recurse

    foreach ($project in $projects) {
        Update-ProjectVersion -ProjectFile $project.FullName -Version $Version
    }

    Write-Host "Updated $($projects.Count) project files" -ForegroundColor Green
}

Task Build -depends UpdateProjectVersions {
    exec { dotnet build -c Release }
}
```

### Updating AssemblyInfo.cs (Legacy)

```powershell
function Update-AssemblyInfo {
    param(
        [string]$AssemblyInfoPath,
        [string]$Version
    )

    if (-not (Test-Path $AssemblyInfoPath)) {
        throw "AssemblyInfo.cs not found: $AssemblyInfoPath"
    }

    Write-Host "Updating AssemblyInfo: $AssemblyInfoPath" -ForegroundColor Green

    $content = Get-Content $AssemblyInfoPath

    # Update version attributes
    $content = $content -replace '\[assembly: AssemblyVersion\(".*?"\)\]', "[assembly: AssemblyVersion(""$Version"")]"
    $content = $content -replace '\[assembly: AssemblyFileVersion\(".*?"\)\]', "[assembly: AssemblyFileVersion(""$Version"")]"
    $content = $content -replace '\[assembly: AssemblyInformationalVersion\(".*?"\)\]', "[assembly: AssemblyInformationalVersion(""$Version"")]"

    Set-Content -Path $AssemblyInfoPath -Value $content

    Write-Host "  Updated to version: $Version" -ForegroundColor Gray
}

Task UpdateAssemblyInfoFiles {
    $assemblyInfoFiles = Get-ChildItem "$SrcDir/**/AssemblyInfo.cs" -Recurse

    foreach ($file in $assemblyInfoFiles) {
        Update-AssemblyInfo -AssemblyInfoPath $file.FullName -Version $Version
    }
}
```

### Updating package.json (Node.js)

```powershell
function Update-PackageVersion {
    param(
        [string]$PackageJsonPath,
        [string]$Version
    )

    if (-not (Test-Path $PackageJsonPath)) {
        throw "package.json not found: $PackageJsonPath"
    }

    Write-Host "Updating package.json version to $Version" -ForegroundColor Green

    $package = Get-Content $PackageJsonPath | ConvertFrom-Json
    $package.version = $Version

    $package | ConvertTo-Json -Depth 100 | Set-Content $PackageJsonPath

    Write-Host "  Updated package.json" -ForegroundColor Gray
}

Task UpdateNodeVersion {
    $packageJson = Join-Path $ProjectRoot 'package.json'
    Update-PackageVersion -PackageJsonPath $packageJson -Version $Version
}
```

## Complete Versioning Example

**psakefile.ps1:**

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $SrcDir = Join-Path $ProjectRoot 'src'
    $BuildDir = Join-Path $ProjectRoot 'build/output'

    # Version configuration
    $MajorVersion = 1
    $MinorVersion = 0
    $PatchVersion = 0

    # CI/CD integration
    $BuildNumber = if ($env:BUILD_NUMBER) { $env:BUILD_NUMBER } else { '0' }
    $GitSha = Get-GitCommitSha
    $Branch = Get-GitBranch

    # Determine version based on branch
    $Version = Get-BuildVersion
}

function Get-GitCommitSha {
    try {
        $sha = git rev-parse --short HEAD 2>$null
        return if ($sha) { $sha } else { 'unknown' }
    }
    catch {
        return 'unknown'
    }
}

function Get-GitBranch {
    try {
        if ($env:BRANCH_NAME) {
            return $env:BRANCH_NAME
        }

        $branch = git rev-parse --abbrev-ref HEAD 2>$null
        return if ($branch) { $branch } else { 'unknown' }
    }
    catch {
        return 'unknown'
    }
}

function Get-BuildVersion {
    $baseVersion = "$MajorVersion.$MinorVersion.$PatchVersion"

    # Determine pre-release label
    $preRelease = switch -Regex ($Branch) {
        '^main$|^master$' {
            # Production release
            return "$baseVersion.$BuildNumber"
        }
        '^release/.*' {
            # Release candidate
            return "$baseVersion-rc.$BuildNumber"
        }
        '^develop$' {
            # Beta release
            return "$baseVersion-beta.$BuildNumber"
        }
        '^hotfix/.*' {
            # Hotfix release
            return "$baseVersion-hotfix.$BuildNumber"
        }
        default {
            # Development/feature build
            $safeBranch = $Branch -replace '[^a-zA-Z0-9]', '-'
            return "$baseVersion-dev.$safeBranch.$BuildNumber"
        }
    }

    return $preRelease
}

FormatTaskName {
    param($taskName)
    Write-Host ""
    Write-Host "Executing: $taskName" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Gray
}

Task Default -depends Build

Task ShowVersion {
    Write-Host ""
    Write-Host "Version Information" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Gray
    Write-Host "  Version:      $Version" -ForegroundColor White
    Write-Host "  Base:         $MajorVersion.$MinorVersion.$PatchVersion" -ForegroundColor Gray
    Write-Host "  Build Number: $BuildNumber" -ForegroundColor Gray
    Write-Host "  Git SHA:      $GitSha" -ForegroundColor Gray
    Write-Host "  Branch:       $Branch" -ForegroundColor Gray
    Write-Host ("=" * 80) -ForegroundColor Gray
    Write-Host ""
}

Task UpdateVersions -depends ShowVersion {
    Write-Host "Updating project versions..." -ForegroundColor Green

    # Update .NET projects
    $projects = Get-ChildItem "$SrcDir/**/*.csproj" -Recurse

    foreach ($project in $projects) {
        [xml]$proj = Get-Content $project.FullName

        $propertyGroup = $proj.Project.PropertyGroup | Select-Object -First 1

        if ($null -eq $propertyGroup.Version) {
            $versionNode = $proj.CreateElement('Version')
            $propertyGroup.AppendChild($versionNode) | Out-Null
        }

        $propertyGroup.Version = $Version

        $proj.Save($project.FullName)

        Write-Host "  Updated: $($project.Name)" -ForegroundColor Gray
    }

    Write-Host "Version updates complete" -ForegroundColor Green
}

Task Clean {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Green

    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }

    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}

Task Build -depends UpdateVersions, Clean {
    Write-Host "Building version $Version..." -ForegroundColor Green

    exec {
        dotnet build $SrcDir `
            -c Release `
            -o $BuildDir `
            /p:Version=$Version `
            /p:InformationalVersion="$Version+$GitSha"
    }

    Write-Host "Build complete: $BuildDir" -ForegroundColor Green
}

Task Pack -depends Build {
    Write-Host "Creating NuGet packages..." -ForegroundColor Green

    exec {
        dotnet pack $SrcDir `
            -c Release `
            -o $BuildDir `
            --no-build `
            /p:PackageVersion=$Version
    }

    $packages = Get-ChildItem "$BuildDir/*.nupkg"
    Write-Host "Created $($packages.Count) package(s)" -ForegroundColor Green
}

Task Tag {
    param([string]$TagVersion)

    if ([string]::IsNullOrEmpty($TagVersion)) {
        $TagVersion = "$MajorVersion.$MinorVersion.$PatchVersion"
    }

    Write-Host "Creating git tag: v$TagVersion" -ForegroundColor Green

    # Ensure we're on main/master
    if ($Branch -notmatch '^(main|master)$') {
        throw "Tags should only be created from main/master branch (current: $Branch)"
    }

    # Check if tag already exists
    $existingTag = git tag -l "v$TagVersion"
    if ($existingTag) {
        throw "Tag v$TagVersion already exists"
    }

    # Create annotated tag
    exec { git tag -a "v$TagVersion" -m "Release $TagVersion" }

    Write-Host "Tag created: v$TagVersion" -ForegroundColor Green
    Write-Host "Push tag with: git push origin v$TagVersion" -ForegroundColor Yellow
}
```

## Best Practices

1. **Use semantic versioning** - Follow MAJOR.MINOR.PATCH conventions
2. **Tag releases in git** - Create git tags for all releases
3. **Include build metadata** - Add commit SHA and build number to informational version
4. **Automate version bumps** - Don't manually edit version numbers
5. **Use pre-release labels** - Distinguish beta, alpha, and RC versions
6. **Keep version in one place** - Single source of truth for version number
7. **Version all artifacts** - DLLs, packages, containers should all have same version
8. **Document version strategy** - Team should understand versioning scheme
9. **Test version updates** - Ensure version updates don't break builds
10. **Archive version history** - Maintain changelog with version history

## See Also

- [GitHub Actions](/docs/ci-examples/github-actions) - CI/CD with versioning
- [Azure Pipelines](/docs/ci-examples/azure-pipelines) - Azure DevOps versioning
- [Node.js Builds](/docs/build-types/nodejs) - Versioning Node.js packages
- [.NET Solution Builds](/docs/build-types/dot-net-solution) - .NET versioning
- [Organizing Large Scripts](/docs/best-practices/organizing-large-scripts) - Version utilities organization
