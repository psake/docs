---
title: "GitHub Actions"
description: "Complete guide to integrating psake with GitHub Actions for automated builds across Windows, Linux, and macOS"
---

# GitHub Actions

GitHub Actions is a popular CI/CD platform that integrates seamlessly with GitHub repositories. This guide shows you how to run psake builds in GitHub Actions workflows, including cross-platform matrix builds, secret management, and artifact publishing.

## Quick Start

Here's a basic GitHub Actions workflow that runs a psake build:

```yaml
name: Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run psake build
        shell: pwsh
        run: |
          Install-Module -Name psake -Scope CurrentUser -Force
          Invoke-psake -buildFile .\psakefile.ps1 -taskList Build
```

## PowerShell on GitHub-Hosted Runners

GitHub-hosted runners come with PowerShell pre-installed on all platforms:

- **PowerShell 7.4+ (`pwsh`)**: Available on Windows, Linux, and macOS runners
- **Windows PowerShell 5.1 (`powershell`)**: Only available on Windows runners

**Important:** Always use `shell: pwsh` in your workflows for cross-platform compatibility. Only use `shell: powershell` if you specifically need Windows PowerShell 5.1 features.

## Installing psake in GitHub Actions

There are several approaches to installing psake in your workflow:

### Option 1: Install from PowerShell Gallery (Recommended)

```yaml
- name: Install psake
  shell: pwsh
  run: Install-Module -Name psake -Scope CurrentUser -Force
```

This is the simplest approach and works on all platforms (Windows, Linux, macOS).

### Option 2: Install Specific Version

```yaml
- name: Install psake 4.9.0
  shell: pwsh
  run: Install-Module -Name psake -RequiredVersion 4.9.0 -Scope CurrentUser -Force
```

### Option 3: Using requirements.psd1 with PSDepend

If your project uses a `requirements.psd1` file:

```yaml
- name: Install dependencies
  shell: pwsh
  run: |
    Install-Module -Name PSDepend -Scope CurrentUser -Force
    Invoke-PSDepend -Path ./requirements.psd1 -Install -Force
```

Your `requirements.psd1`:

```powershell
@{
    psake = @{
        Version = '4.9.0'
    }
    # Other dependencies...
}
```

### Option 4: Cache psake Installation

To speed up builds, cache the PowerShell modules directory:

```yaml
- name: Cache PowerShell modules
  uses: actions/cache@v4
  with:
    path: |
      ~/.local/share/powershell/Modules
      ~/Documents/PowerShell/Modules
    key: ${{ runner.os }}-psake-${{ hashFiles('**/requirements.psd1') }}
    restore-keys: |
      ${{ runner.os }}-psake-

- name: Install psake
  shell: pwsh
  run: |
    if (-not (Get-Module -ListAvailable -Name psake)) {
      Install-Module -Name psake -Scope CurrentUser -Force
    }
```

## Complete Workflow Example

Here's a comprehensive workflow demonstrating psake integration:

```yaml
name: psake Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

env:
  BUILD_CONFIGURATION: Release

jobs:
  build:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for versioning

      - name: Setup PowerShell modules cache
        uses: actions/cache@v4
        with:
          path: ~/.local/share/powershell/Modules
          key: ${{ runner.os }}-psake-modules-${{ hashFiles('**/requirements.psd1') }}

      - name: Install psake and dependencies
        shell: pwsh
        run: |
          Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
          Install-Module -Name psake -Scope CurrentUser -Force
          Install-Module -Name PSDepend -Scope CurrentUser -Force

          if (Test-Path ./requirements.psd1) {
            Invoke-PSDepend -Path ./requirements.psd1 -Install -Force
          }

      - name: Run psake build
        shell: pwsh
        run: |
          Invoke-psake -buildFile .\psakefile.ps1 `
            -taskList Build, Test `
            -parameters @{
              Configuration = $env:BUILD_CONFIGURATION
              BuildNumber = $env:GITHUB_RUN_NUMBER
            }
        env:
          # Pass secrets as environment variables
          NUGET_API_KEY: ${{ secrets.NUGET_API_KEY }}

      - name: Check build result
        shell: pwsh
        run: |
          if (-not $?) {
            Write-Error "psake build failed"
            exit 1
          }

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        if: success()
        with:
          name: build-output
          path: |
            ./build/
            ./dist/
          retention-days: 7

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: ./TestResults/
          retention-days: 30
```

## Cross-Platform Matrix Builds

psake works on Windows, Linux, and macOS. Use matrix builds to test across platforms:

```yaml
name: Cross-Platform Build

on: [push, pull_request]

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Scope CurrentUser -Force

      - name: Display environment info
        shell: pwsh
        run: |
          Write-Host "OS: ${{ matrix.os }}"
          Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)"
          Write-Host "psake Version: $((Get-Module -ListAvailable psake).Version)"

      - name: Run psake build
        shell: pwsh
        run: |
          Invoke-psake -buildFile .\psakefile.ps1 -taskList Build, Test

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.os }}
          path: ./build/
```

**Testing with Windows PowerShell 5.1:**

If you need to test specifically with Windows PowerShell 5.1, add a separate job:

```yaml
jobs:
  build-cross-platform:
    # ... pwsh matrix build from above ...

  build-windows-powershell:
    runs-on: windows-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install psake
        shell: powershell  # Windows PowerShell 5.1
        run: Install-Module -Name psake -Scope CurrentUser -Force

      - name: Run psake build
        shell: powershell
        run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Build, Test
```

## Secret Management

GitHub Actions provides a secure way to store and use secrets in your workflows.

### Setting Up Secrets

1. Go to your repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secrets like `NUGET_API_KEY`, `SIGNING_CERT_PASSWORD`, etc.

### Using Secrets in psake

**Method 1: Environment Variables**

```yaml
- name: Run psake with secrets
  shell: pwsh
  run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Deploy
  env:
    NUGET_API_KEY: ${{ secrets.NUGET_API_KEY }}
    AZURE_CONNECTION_STRING: ${{ secrets.AZURE_CONNECTION_STRING }}
```

In your `psakefile.ps1`:

```powershell
Task Deploy {
    $apiKey = $env:NUGET_API_KEY
    if ([string]::IsNullOrEmpty($apiKey)) {
        throw "NUGET_API_KEY environment variable is not set"
    }

    # Use the API key
    dotnet nuget push "*.nupkg" --api-key $apiKey --source https://api.nuget.org/v3/index.json
}
```

**Method 2: Parameters**

```yaml
- name: Run psake with secrets
  shell: pwsh
  run: |
    Invoke-psake -buildFile .\psakefile.ps1 `
      -taskList Deploy `
      -parameters @{
        NuGetApiKey = $env:NUGET_API_KEY
        Environment = 'Production'
      }
  env:
    NUGET_API_KEY: ${{ secrets.NUGET_API_KEY }}
```

In your `psakefile.ps1`:

```powershell
Properties {
    $NuGetApiKey = $null
    $Environment = 'Development'
}

Task Deploy -precondition { $Environment -eq 'Production' } {
    if ([string]::IsNullOrEmpty($NuGetApiKey)) {
        throw "NuGetApiKey parameter is required for deployment"
    }

    dotnet nuget push "*.nupkg" --api-key $NuGetApiKey
}
```

### Security Best Practices

- **Never hardcode secrets** in your psakefile.ps1 or commit them to source control
- **Use environment-specific secrets** for different deployment targets
- **Limit secret access** to specific environments or branches using environment protection rules
- **Rotate secrets regularly** and use GitHub's secret scanning to detect exposed secrets

## Artifact Publishing

### Publishing Build Artifacts

```yaml
- name: Build with psake
  shell: pwsh
  run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Build

- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build-output-${{ github.run_number }}
    path: |
      ./build/**/*.dll
      ./build/**/*.exe
      ./build/**/*.nupkg
    if-no-files-found: error
    retention-days: 7
```

### Publishing NuGet Packages

```yaml
- name: Build and pack
  shell: pwsh
  run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Build, Pack

- name: Publish to NuGet
  if: github.ref == 'refs/heads/main'
  shell: pwsh
  run: |
    Invoke-psake -buildFile .\psakefile.ps1 `
      -taskList Publish `
      -parameters @{ NuGetApiKey = $env:NUGET_API_KEY }
  env:
    NUGET_API_KEY: ${{ secrets.NUGET_API_KEY }}
```

### Publishing to GitHub Releases

```yaml
- name: Build release
  shell: pwsh
  run: |
    Invoke-psake -buildFile .\psakefile.ps1 `
      -taskList Build `
      -parameters @{
        Configuration = 'Release'
        Version = $env:GITHUB_REF_NAME
      }

- name: Create GitHub Release
  if: startsWith(github.ref, 'refs/tags/')
  uses: softprops/action-gh-release@v2
  with:
    files: |
      ./build/*.zip
      ./build/*.nupkg
    generate_release_notes: true
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Example Repository Structure

Here's a recommended repository structure for using psake with GitHub Actions:

```
my-project/
├── .github/
│   └── workflows/
│       ├── build.yml              # Main build workflow
│       ├── release.yml            # Release workflow
│       └── pr-validation.yml      # Pull request checks
├── src/
│   └── MyProject/
│       └── MyProject.csproj
├── tests/
│   └── MyProject.Tests/
│       └── MyProject.Tests.csproj
├── build/                         # Build output directory
├── psakefile.ps1                  # Main build script
├── requirements.psd1              # PowerShell dependencies
└── README.md
```

**psakefile.ps1** example:

```powershell
Properties {
    $Configuration = 'Debug'
    $BuildNumber = '0'
    $Version = "1.0.$BuildNumber"
    $SrcDir = Join-Path $PSScriptRoot 'src'
    $TestDir = Join-Path $PSScriptRoot 'tests'
    $BuildDir = Join-Path $PSScriptRoot 'build'
}

Task Default -depends Build, Test

Task Clean {
    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}

Task Build -depends Clean {
    exec { dotnet build $SrcDir -c $Configuration -o $BuildDir /p:Version=$Version }
}

Task Test -depends Build {
    exec { dotnet test $TestDir -c $Configuration --no-build }
}

Task Pack -depends Build {
    exec { dotnet pack $SrcDir -c $Configuration -o $BuildDir /p:Version=$Version }
}

Task Publish -depends Pack {
    $apiKey = $env:NUGET_API_KEY
    if ([string]::IsNullOrEmpty($apiKey)) {
        throw "NUGET_API_KEY environment variable is required"
    }

    Get-ChildItem "$BuildDir/*.nupkg" | ForEach-Object {
        exec { dotnet nuget push $_.FullName --api-key $apiKey --source https://api.nuget.org/v3/index.json }
    }
}
```

## Common Troubleshooting

### psake Module Not Found

**Problem:** `Import-Module: The specified module 'psake' was not loaded`

**Solution:**
```yaml
- name: Install psake with verbose output
  shell: pwsh
  run: |
    Install-Module -Name psake -Scope CurrentUser -Force -Verbose
    Get-Module -ListAvailable psake
```

### PowerShell Execution Policy Issues

**Problem:** Scripts fail due to execution policy on Windows runners

**Solution:** Use `shell: pwsh` (PowerShell 7) instead of `shell: powershell` (Windows PowerShell 5.1):
```yaml
- name: Run psake
  shell: pwsh  # PowerShell 7 - available on all platforms
  run: Invoke-psake
```

**Note:** The `pwsh` shell is available on Windows, Linux, and macOS runners. The `powershell` shell is only available on Windows and may have stricter execution policies.

### Build Failures Not Failing the Workflow

**Problem:** psake build fails but workflow shows success

**Solution:** Ensure psake errors exit with non-zero code:

```powershell
# In your psakefile.ps1
FormatTaskName {
    param($taskName)
    Write-Host "Executing task: $taskName" -ForegroundColor Cyan
}

# Use exec for external commands
Task Build {
    exec { dotnet build }  # Will fail the build on non-zero exit code
}
```

Or check the result explicitly:
```yaml
- name: Run psake build
  shell: pwsh
  run: |
    Invoke-psake -buildFile .\psakefile.ps1
    if (-not $?) {
      exit 1
    }
```

### Path Issues on Cross-Platform Builds

**Problem:** Windows paths don't work on Linux/macOS

**Solution:** Use PowerShell's cross-platform path cmdlets:

```powershell
Properties {
    # Instead of: $BuildDir = "$PSScriptRoot\build"
    $BuildDir = Join-Path $PSScriptRoot 'build'

    # Instead of: $OutputPath = ".\build\bin"
    $OutputPath = Join-Path (Join-Path $PSScriptRoot 'build') 'bin'
}
```

### Module Caching Not Working

**Problem:** Cache doesn't restore modules correctly

**Solution:** List both Windows and Unix paths—GitHub Actions will cache what exists:

```yaml
- name: Cache PowerShell modules
  uses: actions/cache@v4
  with:
    path: |
      ~/.local/share/powershell/Modules
      ~/Documents/PowerShell/Modules
    key: ${{ runner.os }}-psake-${{ hashFiles('**/requirements.psd1') }}
```

### Secrets Not Available in Forked PRs

**Problem:** Workflows from forked pull requests can't access secrets

**Solution:** This is a security feature. For PRs from forks:
- Use `pull_request_target` event (be cautious - review code first)
- Or manually trigger workflows after review
- Or skip deployment tasks for untrusted PRs

```yaml
- name: Deploy
  if: github.event.pull_request.head.repo.full_name == github.repository
  shell: pwsh
  run: Invoke-psake -taskList Deploy
```

## Advanced Patterns

### Conditional Task Execution Based on Changed Files

```yaml
- name: Detect changes
  id: changes
  uses: dorny/paths-filter@v3
  with:
    filters: |
      src:
        - 'src/**'
      docs:
        - 'docs/**'

- name: Build code
  if: steps.changes.outputs.src == 'true'
  shell: pwsh
  run: Invoke-psake -taskList Build

- name: Build docs
  if: steps.changes.outputs.docs == 'true'
  shell: pwsh
  run: Invoke-psake -taskList BuildDocs
```

### Reusable Workflows

Create `.github/workflows/psake-build.yml` as a reusable workflow:

```yaml
name: Reusable psake Build

on:
  workflow_call:
    inputs:
      task-list:
        required: true
        type: string
      configuration:
        required: false
        type: string
        default: 'Release'
    secrets:
      nuget-api-key:
        required: false

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Scope CurrentUser -Force

      - name: Run psake
        shell: pwsh
        run: |
          Invoke-psake -taskList $env:TASK_LIST `
            -parameters @{ Configuration = $env:CONFIGURATION }
        env:
          TASK_LIST: ${{ inputs.task-list }}
          CONFIGURATION: ${{ inputs.configuration }}
          NUGET_API_KEY: ${{ secrets.nuget-api-key }}
```

Use it in other workflows:

```yaml
name: Main Build

on: [push]

jobs:
  build:
    uses: ./.github/workflows/psake-build.yml
    with:
      task-list: 'Build, Test'
      configuration: 'Release'
```

## See Also

- [Installing psake](/docs/tutorial-basics/installing) - Installation guide
- [Running psake](/docs/tutorial-basics/run-psake) - Basic usage
- [Parameters and Properties](/docs/tutorial-basics/parameters-properties) - Parameterizing builds
- [Team City](/docs/ci-examples/team-city) - TeamCity integration
- [.NET Solution Builds](/docs/build-types/dot-net-solution) - .NET build examples
