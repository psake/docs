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

    It 'Build file is valid PowerShell' {
        { . $BuildFile } | Should -Not -Throw
    }

    It 'Default task executes successfully' {
        $result = Invoke-psake -buildFile $BuildFile -nologo
        $result | Should -Be $true
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

    It 'Build file has no syntax errors' {
        { $null = & $BuildFile } | Should -Not -Throw
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
            $result | Should -Be $true
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
        $script:ExecutedTasks = @()

        # Mock exec to track task execution
        Mock -ModuleName psake -CommandName 'exec' -MockWith {
            param($cmd, $errorMessage)
            # Track execution instead of actually running
            return $true
        }
    }

    It 'Build depends on Compile' {
        # Load build file
        . $BuildFile

        # Get task dependencies
        $buildTask = Get-PSakeScriptTask -taskName 'Build'
        $buildTask.DependsOn | Should -Contain 'Compile'
    }

    It 'Deploy depends on Build and Test' {
        . $BuildFile

        $deployTask = Get-PSakeScriptTask -taskName 'Deploy'
        $deployTask.DependsOn | Should -Contain 'Build'
        $deployTask.DependsOn | Should -Contain 'Test'
    }

    It 'Tasks execute in correct order' {
        $executionOrder = @()

        # Override task execution to track order
        function Track-TaskExecution {
            param($taskName)
            $script:executionOrder += $taskName
        }

        # Run build and track execution
        # This requires modifying the build script to support test mode
        $env:PSAKE_TEST_MODE = 'true'
        Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo
        $env:PSAKE_TEST_MODE = $null

        # Verify order
        $executionOrder.IndexOf('Compile') | Should -BeLessThan $executionOrder.IndexOf('Build')
        $executionOrder.IndexOf('Build') | Should -BeLessThan $executionOrder.IndexOf('Deploy')
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
            param($Command)

            switch ($Command) {
                'build' {
                    Write-Output "Build succeeded"
                    return 0
                }
                'test' {
                    Write-Output "Tests passed: 50 passed, 0 failed"
                    return 0
                }
                'publish' {
                    Write-Output "Publish succeeded"
                    return 0
                }
                default {
                    return 0
                }
            }
        } -ModuleName psake
    }

    It 'Compile task calls dotnet build' {
        Invoke-psake -buildFile $BuildFile -taskList Compile -nologo

        # Verify dotnet build was called
        Should -Invoke -CommandName 'dotnet' -ParameterFilter {
            $Command -eq 'build'
        } -Times 1 -ModuleName psake
    }

    It 'Test task calls dotnet test' {
        Invoke-psake -buildFile $BuildFile -taskList Test -nologo

        Should -Invoke -CommandName 'dotnet' -ParameterFilter {
            $Command -eq 'test'
        } -Times 1 -ModuleName psake
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
            param($Command)

            if ($Command -eq 'login') {
                return @"
[
  {
    "cloudName": "AzureCloud",
    "id": "12345678-1234-1234-1234-123456789012",
    "state": "Enabled"
  }
]
"@
            }

            if ($Command -eq 'webapp') {
                return "Deployment successful"
            }

            return ""
        }
    }

    It 'Deploy task authenticates with Azure' {
        Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo

        Should -Invoke -CommandName 'az' -ParameterFilter {
            $Command -eq 'login'
        } -Times 1
    }

    It 'Deploy task deploys to Azure Web App' {
        Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo

        Should -Invoke -CommandName 'az' -ParameterFilter {
            $Command -eq 'webapp'
        } -Times 1
    }
}
```

## Testing Properties and Parameters

Validate that properties are set correctly:

```powershell
Describe 'Build Properties' {
    BeforeAll {
        $script:BuildFile = Join-Path $PSScriptRoot '../psakefile.ps1'
    }

    It 'Default configuration is Debug' {
        # Load build file
        . $BuildFile

        # Check property
        $psake.context.peek().config.Configuration | Should -Be 'Debug'
    }

    It 'Configuration can be overridden' {
        $parameters = @{
            Configuration = 'Release'
        }

        Invoke-psake -buildFile $BuildFile `
            -parameters $parameters `
            -taskList ShowConfig `
            -nologo

        # Verify configuration was set
        # This requires the build script to expose configuration
    }

    It 'Environment defaults to dev' {
        . $BuildFile

        $psake.context.peek().config.Environment | Should -Be 'dev'
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
            $result | Should -Be $true
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
            $params = @{ Configuration = 'Debug' }
            $result = Invoke-psake -buildFile $BuildFile -parameters $params -nologo
            $result | Should -Be $true
        }

        It 'Release build succeeds' {
            $params = @{ Configuration = 'Release' }
            $result = Invoke-psake -buildFile $BuildFile -parameters $params -nologo
            $result | Should -Be $true
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
        # Mock dotnet to return error
        Mock -CommandName 'dotnet' -MockWith {
            Write-Error "Compilation failed"
            return 1
        }

        $result = Invoke-psake -buildFile $BuildFile -taskList Compile -nologo
        $result | Should -Be $false
    }

    It 'Build fails when tests fail' {
        Mock -CommandName 'dotnet' -MockWith {
            param($Command)

            if ($Command -eq 'test') {
                Write-Error "Tests failed"
                return 1
            }
            return 0
        }

        $result = Invoke-psake -buildFile $BuildFile -taskList Test -nologo
        $result | Should -Be $false
    }

    It 'Build validates required secrets' {
        # Clear environment variables
        $originalApiKey = $env:API_KEY
        $env:API_KEY = $null

        try {
            { Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo } | Should -Throw
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

        It 'Build file is valid PowerShell' {
            { . $BuildFile } | Should -Not -Throw
        }

        It 'Build tasks directory exists' {
            $tasksDir = Join-Path $ProjectRoot 'build/tasks'
            Test-Path $tasksDir | Should -Be $true
        }
    }

    Context 'Task Definitions' {
        BeforeAll {
            . $BuildFile
        }

        It 'Defines Default task' {
            $task = Get-PSakeScriptTask -taskName 'Default'
            $task | Should -Not -BeNullOrEmpty
        }

        It 'Defines Build task' {
            $task = Get-PSakeScriptTask -taskName 'Build'
            $task | Should -Not -BeNullOrEmpty
        }

        It 'Defines Test task' {
            $task = Get-PSakeScriptTask -taskName 'Test'
            $task | Should -Not -BeNullOrEmpty
        }

        It 'Test task depends on Build' {
            $task = Get-PSakeScriptTask -taskName 'Test'
            $task.DependsOn | Should -Contain 'Build'
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
            $result | Should -Be $true
        }

        It 'Build task executes successfully' {
            $result = Invoke-psake -buildFile $BuildFile -taskList Build -nologo
            $result | Should -Be $true
        }

        It 'Full pipeline executes successfully' {
            $result = Invoke-psake -buildFile $BuildFile -nologo
            $result | Should -Be $true
        }
    }

    Context 'Properties and Configuration' {
        It 'Respects Configuration parameter' {
            $params = @{ Configuration = 'Release' }
            $result = Invoke-psake -buildFile $BuildFile -parameters $params -taskList ShowConfig -nologo
            $result | Should -Be $true
        }

        It 'Respects Environment parameter' {
            $params = @{ Environment = 'staging' }
            $result = Invoke-psake -buildFile $BuildFile -parameters $params -taskList ShowConfig -nologo
            $result | Should -Be $true
        }
    }

    Context 'Error Handling' {
        It 'Fails gracefully on invalid task' {
            $result = Invoke-psake -buildFile $BuildFile -taskList InvalidTask -nologo
            $result | Should -Be $false
        }

        It 'Validates required environment variables' {
            $originalEnv = $env:REQUIRED_VAR
            $env:REQUIRED_VAR = $null

            try {
                { Invoke-psake -buildFile $BuildFile -taskList Deploy -nologo } | Should -Throw
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
