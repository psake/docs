---
title: "Testing Build Scripts"
description: "Test your psake build scripts using Pester, mock external commands, validate task dependencies, and integrate with CI/CD pipelines"
---

# Testing Build Scripts

Build scripts are code and should be tested like any other code. This guide shows you how to write tests for psake scripts using Pester, mock external dependencies, validate task execution, and integrate testing into your CI/CD pipeline.

## Quick Start

Here's a basic Pester test for a psake build script:

```powershell
# tests/Build.Tests.ps1

Describe 'psake Build Script' {
    BeforeAll {
        # Import psake
        Import-Module psake -Force

        # Set up test environment
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'
    }

    It 'Build file exists' {
        Test-Path $BuildFile | Should -Be $true
    }

    It 'Build file defines valid tasks' {
        { Get-PSakeScriptTasks -BuildFile $BuildFile } | Should -Not -Throw
    }

    It 'Default task executes successfully' {
        $result = Invoke-psake -buildFile $BuildFile -nologo
        $result.Success | Should -BeTrue
    }
}
```

Run the tests:

```powershell
Invoke-Pester -Path ./tests/Build.Tests.ps1
```

## Setting Up Pester

### Installation

```powershell
# Install Pester (v5+)
Install-Module -Name Pester -Force -SkipPublisherCheck

# Verify installation
Get-Module -Name Pester -ListAvailable
```

### Basic Test Structure

**tests/Build.Tests.ps1:**

```powershell
BeforeAll {
    # Import required modules
    Import-Module psake -Force

    # Define paths
    $script:ProjectRoot = Split-Path $PSScriptRoot -Parent
    $script:BuildFile = Join-Path $ProjectRoot 'psakefile.ps1'
    $script:BuildDir = Join-Path $ProjectRoot 'build/output'

    # Mock external commands if needed
    Mock -CommandName 'dotnet' -MockWith { return 0 }
}

Describe 'psake Build Configuration' {
    It 'Build file exists' {
        Test-Path $BuildFile | Should -Be $true
    }

    It 'Build file defines valid tasks' {
        { Get-PSakeScriptTasks -BuildFile $BuildFile } | Should -Not -Throw
    }
}

Describe 'Build Tasks' {
    Context 'Clean Task' {
        It 'Removes build directory' {
            # Create test build directory
            New-Item -ItemType Directory -Path $BuildDir -Force

            # Run Clean task
            Invoke-psake -buildFile $BuildFile -taskList Clean -nologo

            # Verify directory removed
            Test-Path $BuildDir | Should -Be $false
        }
    }

    Context 'Build Task' {
        It 'Executes without errors' {
            $result = Invoke-psake -buildFile $BuildFile -taskList Build -nologo
            $result.Success | Should -BeTrue
        }

        It 'Creates build artifacts' {
            Invoke-psake -buildFile $BuildFile -taskList Build -nologo
            (Get-ChildItem $BuildDir).Count | Should -BeGreaterThan 0
        }
    }
}

AfterAll {
    # Clean up test artifacts
    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
}
```

## Testing Task Dependencies

Ensure tasks execute in the correct order:

```powershell
# tests/TaskDependencies.Tests.ps1

Describe 'Task Dependencies' {
    BeforeAll {
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'
        $script:Tasks = Get-PSakeScriptTasks -BuildFile $BuildFile
    }

    It 'Build depends on Compile' {
        $buildTask = $Tasks | Where-Object Name -eq 'Build'
        $buildTask.DependsOn | Should -Contain 'Compile'
    }

    It 'Deploy depends on Build and Test' {
        $deployTask = $Tasks | Where-Object Name -eq 'Deploy'
        $deployTask.DependsOn | Should -Contain 'Build'
        $deployTask.DependsOn | Should -Contain 'Test'
    }

    It 'Executes dependencies before Deploy' {
        $result = Invoke-psake -BuildFile $BuildFile -TaskList Deploy -NoLogo
        $result.Success | Should -BeTrue

        $executedTasks = @($result.Tasks | Where-Object Status -eq 'Executed' | ForEach-Object Name)
        $executedTasks.IndexOf('Compile') | Should -BeLessThan $executedTasks.IndexOf('Build')
        $executedTasks.IndexOf('Build') | Should -BeLessThan $executedTasks.IndexOf('Deploy')
    }
}
```

## Mocking External Commands

Mock external tools to test build logic without side effects:

### Mocking dotnet CLI

```powershell
Describe 'Build with Mocked dotnet' {
    BeforeAll {
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'

        # Mock dotnet commands
        Mock -CommandName 'dotnet' -MockWith {
            switch ($args[0]) {
                'build' { 'Build succeeded' }
                'test' { 'Tests passed: 50 passed, 0 failed' }
                'publish' { 'Publish succeeded' }
            }
        }
    }

    It 'Compile task calls dotnet build' {
        Invoke-psake -buildFile $BuildFile -taskList Compile -nologo

        # Verify dotnet build was called
        Should -Invoke -CommandName 'dotnet' -ParameterFilter {
            $args[0] -eq 'build'
        } -Times 1
    }

    It 'Test task calls dotnet test' {
        Invoke-psake -buildFile $BuildFile -taskList Test -nologo

        Should -Invoke -CommandName 'dotnet' -ParameterFilter {
            $args[0] -eq 'test'
        } -Times 1
    }
}
```

### Mocking File System Operations

```powershell
Describe 'File Operations' {
    BeforeAll {
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'

        # Mock file system commands
        Mock -CommandName 'Remove-Item' -MockWith { return $true }
        Mock -CommandName 'New-Item' -MockWith {
            param($Path, $ItemType)
            return [PSCustomObject]@{
                FullName = $Path
                Exists = $true
            }
        }
        Mock -CommandName 'Copy-Item' -MockWith { return $true }
    }

    It 'Clean task removes build directory' {
        Invoke-psake -buildFile $BuildFile -taskList Clean -nologo

        Should -Invoke -CommandName 'Remove-Item' -Times 1
    }

    It 'Package task creates deployment package' {
        Invoke-psake -buildFile $BuildFile -taskList Package -nologo

        Should -Invoke -CommandName 'Compress-Archive' -Times 1
    }
}
```

### Mocking Cloud CLI Tools

```powershell
Describe 'Azure Deployment' {
    BeforeAll {
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'

        # Mock az CLI
        Mock -CommandName 'az' -MockWith {
            if ($args[0] -eq 'login') {
                return '[{"cloudName":"AzureCloud","state":"Enabled"}]'
            }

            if ($args[0] -eq 'webapp') {
                return '{"status":"Success"}'
            }
        }
    }

    It 'Deploy task authenticates with Azure' {
        Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo

        Should -Invoke -CommandName 'az' -ParameterFilter {
            $args[0] -eq 'login'
        } -Times 1
    }

    It 'Deploy task deploys to Azure Web App' {
        Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo

        Should -Invoke -CommandName 'az' -ParameterFilter {
            $args[0] -eq 'webapp'
        } -Times 1
    }
}
```

### Mocking AWS CLI

```powershell
Describe 'AWS Deployment' {
    BeforeAll {
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'
        Mock -CommandName 'aws' -MockWith {
            if ($args[0] -eq 'deploy' -and $args[1] -eq 'create-deployment') {
                return '{"deploymentId":"d-1234567890"}'
            }
        }
    }

    It 'Creates a CodeDeploy deployment' {
        $result = Invoke-psake -BuildFile $BuildFile -TaskList Deploy:AWS -NoLogo
        $result.Success | Should -BeTrue
        Should -Invoke -CommandName 'aws' -ParameterFilter {
            $args[0] -eq 'deploy' -and $args[1] -eq 'create-deployment'
        } -Times 1
    }
}
```

## Testing Properties and Parameters

Put assertions that depend on build properties inside tasks, where psake properties are in scope:

```powershell
# psakefile.ps1
Properties {
    $Configuration = 'Debug'
    $Environment = 'dev'
}

Task ValidateDebugConfiguration {
    Assert ($Configuration -eq 'Debug') 'Expected Debug configuration'
}

Task ValidateReleaseConfiguration {
    Assert ($Configuration -eq 'Release') 'Expected Release configuration'
}

Task ValidateDevelopmentEnvironment {
    Assert ($Environment -eq 'dev') 'Expected dev environment'
}

Task ValidateStagingEnvironment {
    Assert ($Environment -eq 'staging') 'Expected staging environment'
}
```

```powershell
Describe 'Build Properties' {
    BeforeAll {
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'
    }

    It 'Uses the default Debug configuration' {
        $result = Invoke-psake -BuildFile $BuildFile -TaskList ValidateDebugConfiguration -NoLogo
        $result.Success | Should -BeTrue
    }

    It 'Accepts a Release configuration override' {
        $result = Invoke-psake -BuildFile $BuildFile `
            -Properties @{ Configuration = 'Release' } `
            -TaskList ValidateReleaseConfiguration -NoLogo
        $result.Success | Should -BeTrue
    }

    It 'Uses the default dev environment' {
        $result = Invoke-psake -BuildFile $BuildFile -TaskList ValidateDevelopmentEnvironment -NoLogo
        $result.Success | Should -BeTrue
    }
}
```

## Integration Tests

Test the complete build pipeline:

```powershell
# tests/Integration.Tests.ps1

Describe 'Complete Build Pipeline' {
    BeforeAll {
        $script:ProjectRoot = Split-Path $PSScriptRoot -Parent
        $script:BuildFile = Join-Path $ProjectRoot 'psakefile.ps1'
        $script:BuildDir = Join-Path $ProjectRoot 'build/output'
        $script:TestResultsDir = Join-Path $ProjectRoot 'TestResults'
    }

    Context 'Full Build' {
        It 'Completes without errors' {
            $result = Invoke-psake -buildFile $BuildFile -nologo
            $result.Success | Should -BeTrue
        }

        It 'Creates build artifacts' {
            Test-Path $BuildDir | Should -Be $true
            (Get-ChildItem $BuildDir -Recurse -File).Count | Should -BeGreaterThan 0
        }

        It 'Runs tests and generates results' {
            Test-Path $TestResultsDir | Should -Be $true
        }

        It 'Build artifacts are valid' {
            $dlls = Get-ChildItem "$BuildDir/*.dll" -Recurse

            foreach ($dll in $dlls) {
                # Verify DLL can be loaded
                { [System.Reflection.Assembly]::LoadFrom($dll.FullName) } | Should -Not -Throw
            }
        }
    }

    Context 'Different Configurations' {
        It 'Debug build succeeds' {
            $result = Invoke-psake -buildFile $BuildFile -properties @{ Configuration = 'Debug' } -nologo
            $result.Success | Should -BeTrue
        }

        It 'Release build succeeds' {
            $result = Invoke-psake -buildFile $BuildFile -properties @{ Configuration = 'Release' } -nologo
            $result.Success | Should -BeTrue
        }
    }

    AfterAll {
        # Clean up
        if (Test-Path $BuildDir) {
            Remove-Item $BuildDir -Recurse -Force
        }
        if (Test-Path $TestResultsDir) {
            Remove-Item $TestResultsDir -Recurse -Force
        }
    }
}
```

## Testing Error Handling

Ensure build fails gracefully:

```powershell
Describe 'Error Handling' {
    BeforeAll {
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'
    }

    It 'Build fails when compilation fails' {
        Mock -CommandName 'dotnet' -MockWith { throw "Compilation failed" }

        $result = Invoke-psake -buildFile $BuildFile -taskList Compile -nologo
        $result.Success | Should -BeFalse
    }

    It 'Build fails when tests fail' {
        Mock -CommandName 'dotnet' -MockWith {
            if ($args[0] -eq 'test') { throw "Tests failed" }
        }

        $result = Invoke-psake -buildFile $BuildFile -taskList Test -nologo
        $result.Success | Should -BeFalse
    }

    It 'Build validates required secrets' {
        $originalApiKey = $env:API_KEY
        $env:API_KEY = $null

        try {
            $result = Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo
            $result.Success | Should -BeFalse
        }
        finally {
            $env:API_KEY = $originalApiKey
        }
    }
}
```

## Test-Friendly Build Scripts

Make your build scripts easier to test:

**psakefile.ps1:**

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $TestMode = $env:PSAKE_TEST_MODE -eq 'true'
}

# Helper function for testable external commands
function Invoke-ExternalCommand {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    if ($TestMode) {
        # In test mode, just log what would be executed
        Write-Host "TEST MODE: Would execute: $Command $($Arguments -join ' ')"
        return $true
    }

    # Normal execution
    & $Command @Arguments
    return $LASTEXITCODE -eq 0
}

Task Build {
    Write-Host "Building..." -ForegroundColor Green

    $success = Invoke-ExternalCommand -Command 'dotnet' -Arguments @('build', '-c', $Configuration)

    if (-not $success) {
        throw "Build failed"
    }
}

Task Test -depends Build {
    Write-Host "Running tests..." -ForegroundColor Green

    $success = Invoke-ExternalCommand -Command 'dotnet' -Arguments @('test')

    if (-not $success) {
        throw "Tests failed"
    }
}

# Expose task information for testing
Task ShowTasks {
    Get-PSakeScriptTasks | ForEach-Object {
        Write-Host "Task: $($_.Name)" -ForegroundColor Cyan
        Write-Host "  Depends: $($_.DependsOn -join ', ')" -ForegroundColor Gray
        Write-Host "  Precondition: $($null -ne $_.Precondition)" -ForegroundColor Gray
    }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Build Scripts

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        shell: pwsh
        run: |
          Install-Module -Name psake -Force
          Install-Module -Name Pester -Force -SkipPublisherCheck

      - name: Run build script tests
        shell: pwsh
        run: |
          Invoke-Pester -Path ./tests -Output Detailed -CI

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: ./testResults.xml
```

### Complete Test Configuration

**PesterConfiguration.ps1:**

```powershell
# Configure Pester
$config = New-PesterConfiguration

# General settings
$config.Run.Path = './tests'
$config.Run.PassThru = $true
$config.Run.Exit = $true

# Output settings
$config.Output.Verbosity = 'Detailed'

# Test result export
$config.TestResult.Enabled = $true
$config.TestResult.OutputFormat = 'NUnitXml'
$config.TestResult.OutputPath = './testResults.xml'

# Code coverage
$config.CodeCoverage.Enabled = $true
$config.CodeCoverage.Path = './psakefile.ps1', './build/**/*.ps1'
$config.CodeCoverage.OutputFormat = 'JaCoCo'
$config.CodeCoverage.OutputPath = './coverage.xml'

# Run tests
$result = Invoke-Pester -Configuration $config

# Exit with test result status
exit $result.FailedCount
```

## Complete Test Suite Example

**tests/BuildScript.Tests.ps1:**

```powershell
BeforeAll {
    # Import modules
    Import-Module psake -Force
    Import-Module Pester -Force

    # Set up paths
    $script:ProjectRoot = Split-Path $PSScriptRoot -Parent
    $script:BuildFile = Join-Path $ProjectRoot 'psakefile.ps1'
    $script:BuildDir = Join-Path $ProjectRoot 'build/output'

    # Enable test mode
    $env:PSAKE_TEST_MODE = 'true'
}

Describe 'Build Script Validation' {
    Context 'File Structure' {
        It 'Build file exists' {
            Test-Path $BuildFile | Should -Be $true
        }

        It 'Build file defines valid tasks' {
            { Get-PSakeScriptTasks -BuildFile $BuildFile } | Should -Not -Throw
        }

        It 'Build tasks directory exists' {
            $tasksDir = Join-Path $ProjectRoot 'build/tasks'
            Test-Path $tasksDir | Should -BeTrue
        }
    }

    Context 'Task Definitions' {
        BeforeAll {
            $script:Tasks = Get-PSakeScriptTasks -BuildFile $BuildFile
        }

        It 'Defines Default task' {
            $Tasks.Name | Should -Contain 'Default'
        }

        It 'Defines Build task' {
            $Tasks.Name | Should -Contain 'Build'
        }

        It 'Defines Test task' {
            $Tasks.Name | Should -Contain 'Test'
        }

        It 'Test task depends on Build' {
            $testTask = $Tasks | Where-Object Name -eq 'Test'
            $testTask.DependsOn | Should -Contain 'Build'
        }
    }

    Context 'Task Execution' {
        BeforeEach {
            # Clean before each test
            if (Test-Path $BuildDir) {
                Remove-Item $BuildDir -Recurse -Force
            }
        }

        It 'Clean task executes successfully' {
            $result = Invoke-psake -buildFile $BuildFile -taskList Clean -nologo
            $result.Success | Should -BeTrue
        }

        It 'Build task executes successfully' {
            $result = Invoke-psake -buildFile $BuildFile -taskList Build -nologo
            $result.Success | Should -BeTrue
        }

        It 'Full pipeline executes successfully' {
            $result = Invoke-psake -buildFile $BuildFile -nologo
            $result.Success | Should -BeTrue
        }
    }

    Context 'Properties and Configuration' {
        It 'Respects Configuration property' {
            $result = Invoke-psake -buildFile $BuildFile -properties @{ Configuration = 'Release' } -taskList ValidateReleaseConfiguration -nologo
            $result.Success | Should -BeTrue
        }

        It 'Respects Environment property' {
            $result = Invoke-psake -buildFile $BuildFile -properties @{ Environment = 'staging' } -taskList ValidateStagingEnvironment -nologo
            $result.Success | Should -BeTrue
        }
    }

    Context 'Error Handling' {
        It 'Fails gracefully on invalid task' {
            $result = Invoke-psake -buildFile $BuildFile -taskList InvalidTask -nologo
            $result.Success | Should -BeFalse
        }

        It 'Validates required environment variables' {
            $originalEnv = $env:REQUIRED_VAR
            $env:REQUIRED_VAR = $null

            try {
                $result = Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo
                $result.Success | Should -BeFalse
            }
            finally {
                $env:REQUIRED_VAR = $originalEnv
            }
        }
    }
}

AfterAll {
    # Clean up
    $env:PSAKE_TEST_MODE = $null

    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
}
```

## Best Practices

1. **Test early and often** - Run tests during development
2. **Mock external dependencies** - Don't rely on external services in tests
3. **Test both success and failure paths** - Ensure proper error handling
4. **Use test mode flags** - Allow build scripts to run in test mode
5. **Test task dependencies** - Verify tasks execute in correct order
6. **Test all configurations** - Validate Debug, Release, and different environments
7. **Keep tests fast** - Mock slow operations
8. **Use meaningful test names** - Describe what's being tested
9. **Clean up after tests** - Remove test artifacts
10. **Integrate with CI/CD** - Run tests automatically on every commit

## See Also

- [Organizing Large Scripts](/docs/best-practices/organizing-large-scripts) - Modular build organization
- [Environment Management](/docs/best-practices/environment-management) - Testing multiple environments
- [GitHub Actions](/docs/ci-examples/github-actions) - CI/CD integration
- [Debug Script](/docs/tutorial-advanced/debug-script) - Debugging psake scripts
- [Logging and Errors](/docs/tutorial-advanced/logging-errors) - Error handling
