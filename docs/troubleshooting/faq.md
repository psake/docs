---
title: "Frequently Asked Questions"
description: "Common questions about psake installation, usage, performance, and integration with other tools"
---

# Frequently Asked Questions

Quick answers to common questions about psake.

## Installation

### What are the system requirements for psake?

**psake requires:**
- PowerShell 5.0 or later (Windows PowerShell)
- OR PowerShell 7+ (PowerShell Core) for cross-platform support
- No other external dependencies

**Recommended:**
- PowerShell 7+ for best cross-platform compatibility
- Latest version of psake from the PowerShell Gallery

### How do I install psake?

```powershell
# Install for current user (no admin required)
Install-Module -Name psake -Scope CurrentUser

# Install globally (requires admin/sudo)
Install-Module -Name psake -Scope AllUsers

# Install specific version
Install-Module -Name psake -RequiredVersion 4.9.0
```

See the [Installing psake](/docs/tutorial-basics/installing) guide for more details.

### Can I use psake without installing it?

Yes, you can use psake without installing it system-wide:

```powershell
# Option 1: Install to a local directory
Save-Module -Name psake -Path ./modules

# Then load it
Import-Module ./modules/psake

# Option 2: Use in a Docker container
docker run -v ${PWD}:/workspace -w /workspace mcr.microsoft.com/powershell:latest pwsh -c "Install-Module psake -Force; Invoke-psake"

# Option 3: Use PSDepend in your project
# Create requirements.psd1:
@{
    psake = 'latest'
}

# Install dependencies
Install-Module PSDepend -Scope CurrentUser
Invoke-PSDepend -Path ./requirements.psd1 -Install
```

### How do I update psake to the latest version?

```powershell
# Update to latest version
Update-Module -Name psake

# Or remove old version and install fresh
Uninstall-Module -Name psake -AllVersions
Install-Module -Name psake
```

### Can I run multiple versions of psake?

Yes, but only one version can be loaded in a PowerShell session at a time:

```powershell
# Install multiple versions
Install-Module psake -RequiredVersion 4.9.0
Install-Module psake -RequiredVersion 4.8.0

# View installed versions
Get-Module psake -ListAvailable

# Load specific version
Import-Module psake -RequiredVersion 4.9.0

# Or use -MinimumVersion
Import-Module psake -MinimumVersion 4.8
```

## Basic Usage

### What's the difference between a task, property, and parameter?

**Task:** A named unit of work in your build script
```powershell
Task Build {
    # Work to perform
}
```

**Property:** A variable defined in the build script
```powershell
Properties {
    $BuildConfiguration = 'Release'
}
```

**Parameter:** A value passed from the command line
```powershell
# In psakefile.ps1
Properties {
    $Version = '1.0.0'  # Default value
}

# Invoke with parameter
Invoke-psake -parameters @{ Version = '2.0.0' }
```

See [Parameters and Properties](/docs/tutorial-basics/parameters-properties) for details.

### How do I pass parameters to my psake build?

```powershell
# Define properties with default values
Properties {
    $Configuration = 'Debug'
    $OutputPath = './build'
}

# Pass parameters when invoking
Invoke-psake -parameters @{
    Configuration = 'Release'
    OutputPath = 'C:/builds/output'
}

# Or use environment variables
$env:BUILD_CONFIG = 'Release'

Properties {
    $Configuration = $env:BUILD_CONFIG ?? 'Debug'
}
```

### Can I run multiple tasks at once?

Yes, specify multiple tasks in the taskList:

```powershell
# Run tasks in order
Invoke-psake -taskList Clean, Build, Test

# Tasks will execute in the order specified, along with their dependencies
```

The tasks will run sequentially in the order you specify, and psake will automatically run any task dependencies.

### How do I see all available tasks in a build script?

```powershell
# List all tasks with descriptions
Invoke-psake -docs

# Detailed documentation including dependencies
Invoke-psake -detaileddocs

# For a specific build file
Invoke-psake -buildFile ./custom.ps1 -docs
```

### What's the difference between `-depends` and calling tasks directly?

**Using `-depends`:** Declares a dependency relationship. psake ensures dependencies run first and only once:

```powershell
Task Build -depends Clean, Compile {
    # Clean and Compile run first (if not already run)
}

Task Test -depends Build {
    # Build runs first (which also runs Clean and Compile)
}

# Invoke-psake -taskList Test
# Execution order: Clean → Compile → Build → Test
# Each task runs exactly once
```

**Calling tasks directly:** Executes the task every time it's called:

```powershell
Task Build {
    Invoke-Task Clean
    Invoke-Task Compile
    # These run every time Build is called
}
```

**Best Practice:** Use `-depends` for declaring task relationships.

### Can I use psake with non-.NET projects?

Absolutely! psake is a general-purpose build tool. It's commonly used for:

- **Node.js projects** - npm install, webpack builds, testing
- **Python projects** - pip install, pytest, package building
- **Go projects** - go build, go test
- **Docker** - Building and pushing images
- **Documentation** - Static site generators
- **Infrastructure** - Terraform, Ansible automation
- **Any scripting** - File processing, data transformation

Example for Node.js:

```powershell
Task Install {
    exec { npm install }
}

Task Build {
    exec { npm run build }
}

Task Test {
    exec { npm test }
}
```

## Performance

### Why is my build slow?

Common causes and solutions:

**1. Unnecessary dependency resolution**
```powershell
# Slow: Running restore on every build
Task Build {
    exec { dotnet restore }
    exec { dotnet build }
}

# Faster: Separate restore task
Task Restore {
    exec { dotnet restore }
}

Task Build -depends Restore {
    exec { dotnet build --no-restore }
}
```

**2. Not using incremental builds**
```powershell
# Slow: Always clean and rebuild everything
Task Build -depends Clean {
    exec { dotnet build }
}

# Faster: Add an IncrementalBuild task
Task IncrementalBuild {
    exec { dotnet build }
}

Task RebuildAll -depends Clean, Build {
    # Full rebuild only when needed
}
```

**3. Serial execution of independent tasks**
```powershell
# Slow: Running tests serially
Task Test -depends UnitTest, IntegrationTest

# Consider: Use parallel execution for independent tasks
Task Test {
    # Run tests in parallel using PowerShell jobs or dotnet test
    $jobs = @(
        Start-Job { dotnet test ./tests/Unit.Tests --no-build }
        Start-Job { dotnet test ./tests/Integration.Tests --no-build }
    )
    $jobs | Wait-Job | Receive-Job
}
```

### How can I speed up my psake builds?

**1. Use caching in CI/CD**
```yaml
# GitHub Actions example
- uses: actions/cache@v4
  with:
    path: ~/.nuget/packages
    key: ${{ runner.os }}-nuget-${{ hashFiles('**/*.csproj') }}
```

**2. Skip unnecessary tasks**
```powershell
Properties {
    $SkipTests = $false
}

Task Build {
    exec { dotnet build }
}

Task Test -depends Build -precondition { -not $SkipTests } {
    exec { dotnet test }
}

# Invoke-psake -parameters @{ SkipTests = $true }
```

**3. Use build output caching**
```powershell
Task Compile {
    $needsRebuild = $false

    Get-ChildItem src/*.cs | ForEach-Object {
        $source = $_
        $output = Join-Path build "$($_.BaseName).dll"

        if (-not (Test-Path $output) -or $source.LastWriteTime -gt (Get-Item $output).LastWriteTime) {
            $needsRebuild = $true
        }
    }

    if ($needsRebuild) {
        exec { dotnet build }
    } else {
        Write-Host "No rebuild needed"
    }
}
```

### Does psake support parallel task execution?

psake executes tasks sequentially to maintain dependency order. However, you can:

**1. Run independent operations in parallel within a task**
```powershell
Task BuildAll {
    # Use PowerShell jobs for parallel execution
    $jobs = @(
        Start-Job -ScriptBlock { dotnet build ./ProjectA }
        Start-Job -ScriptBlock { dotnet build ./ProjectB }
    )

    $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job

    # Or use ForEach-Object -Parallel (PowerShell 7+)
    @('ProjectA', 'ProjectB') | ForEach-Object -Parallel {
        dotnet build ./$_
    } -ThrottleLimit 4
}
```

**2. Use external tools for parallel builds**
```powershell
Task BuildSolution {
    # MSBuild can build projects in parallel
    exec { msbuild /m /p:Configuration=Release }

    # Or dotnet build
    exec { dotnet build -m }
}
```

## Integration

### Can I use psake with CI/CD systems?

Yes! psake works with all major CI/CD platforms:

- **GitHub Actions** - See [GitHub Actions guide](/docs/ci-examples/github-actions)
- **Azure Pipelines** - See [Azure Pipelines guide](/docs/ci-examples/azure-pipelines)
- **GitLab CI** - See [GitLab CI guide](/docs/ci-examples/gitlab-ci)
- **Jenkins, TeamCity, etc.** - Just run PowerShell scripts

Basic pattern:

```bash
# Install psake
pwsh -Command "Install-Module psake -Force"

# Run build
pwsh -Command "Invoke-psake -buildFile ./psakefile.ps1 -taskList Build"
```

### How do I integrate psake with MSBuild?

```powershell
# Call MSBuild from psake
Task Build {
    exec { msbuild /t:Build /p:Configuration=Release MySolution.sln }
}

# Or call psake from MSBuild (in .csproj/.targets)
<Target Name="CustomBuild">
  <Exec Command="pwsh -Command &quot;Invoke-psake -taskList Build&quot;" />
</Target>

# Better: Use psake to orchestrate MSBuild
Properties {
    $SolutionFile = 'MySolution.sln'
    $Configuration = 'Release'
}

Task Restore {
    exec { msbuild /t:Restore $SolutionFile }
}

Task Build -depends Restore {
    exec { msbuild /t:Build /p:Configuration=$Configuration $SolutionFile }
}

Task Pack -depends Build {
    exec { msbuild /t:Pack /p:Configuration=$Configuration $SolutionFile }
}
```

### Can I call psake tasks from another psake script?

Yes, using several methods:

**Method 1: Include another build file**
```powershell
# In main psakefile.ps1
Include .\shared-tasks.ps1

Task Build -depends SharedTask {
    # SharedTask is from shared-tasks.ps1
}
```

**Method 2: Invoke another build file**
```powershell
Task BuildSubproject {
    Invoke-psake -buildFile ./subproject/psakefile.ps1 -taskList Build
}
```

**Method 3: Nested build (legacy)**
```powershell
Task BuildAll {
    Invoke-psake ./project1/psakefile.ps1 -taskList Build
    Invoke-psake ./project2/psakefile.ps1 -taskList Build
}
```

See [Nested Builds](/docs/tutorial-basics/nested-build) for details.

### How do I use psake with Docker?

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/powershell:latest

WORKDIR /build

# Install psake
RUN pwsh -Command "Install-Module -Name psake -Scope CurrentUser -Force"

# Copy build files
COPY . .

# Run build
CMD ["pwsh", "-Command", "Invoke-psake -taskList Build"]
```

Or in your psakefile.ps1:

```powershell
Task BuildDockerImage {
    exec { docker build -t myapp:latest . }
}

Task RunInDocker {
    exec { docker run --rm -v ${PWD}:/workspace -w /workspace mcr.microsoft.com/powershell pwsh -c "Install-Module psake -Force; Invoke-psake" }
}
```

### Can I use psake with Invoke-Build or other build tools?

Yes, they can coexist:

```powershell
# Call Invoke-Build from psake
Task RunInvokeBuild {
    exec { Invoke-Build -File ./project.build.ps1 }
}

# Call psake from Invoke-Build
task RunPsake {
    exec { Invoke-psake -buildFile ./psakefile.ps1 }
}

# Use the right tool for each scenario:
# - psake: Simple, declarative builds with task dependencies
# - Invoke-Build: More complex build logic, better for large scripts
```

## Troubleshooting

### How do I debug my build script?

See the [Debugging Guide](/docs/troubleshooting/debugging-guide) for comprehensive debugging techniques.

Quick tips:

```powershell
# Enable verbose output
Invoke-psake -Verbose

# Add debug output
Task Build {
    Write-Host "Configuration: $Configuration"
    Write-Host "BuildDir: $BuildDir"
    exec { dotnet build } -Verbose
}

# Use PowerShell debugger
Set-PSBreakpoint -Script .\psakefile.ps1 -Line 42
Invoke-psake
```

### Where can I find more help?

- **Documentation:** [psake.readthedocs.io](https://psake.readthedocs.io/)
- **GitHub Issues:** [github.com/psake/psake/issues](https://github.com/psake/psake/issues)
- **Source Code:** [github.com/psake/psake](https://github.com/psake/psake)
- **Examples:** Check the `examples/` directory in the psake repository

### How do I report a bug or request a feature?

Visit the [psake GitHub repository](https://github.com/psake/psake) and:

1. Search existing issues to avoid duplicates
2. Create a new issue with:
   - Clear description of the problem or feature
   - Minimal reproducible example
   - Your PowerShell version (`$PSVersionTable`)
   - Your psake version (`Get-Module psake | Select-Object Version`)

## See Also

- [Common Errors](/docs/troubleshooting/common-errors) - Solutions to frequent problems
- [Debugging Guide](/docs/troubleshooting/debugging-guide) - Debugging techniques
- [Installing psake](/docs/tutorial-basics/installing) - Installation guide
- [Running psake](/docs/tutorial-basics/run-psake) - Basic usage
- [Parameters and Properties](/docs/tutorial-basics/parameters-properties) - Parameter handling
