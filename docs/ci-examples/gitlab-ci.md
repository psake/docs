---
title: "GitLab CI/CD"
description: "Complete guide to integrating psake with GitLab CI/CD for automated builds with pipeline stages, CI/CD variables, and Docker executors"
---

# GitLab CI/CD

GitLab CI/CD is a powerful, integrated CI/CD platform built into GitLab. This guide shows you how to run psake builds in GitLab CI/CD pipelines, including multi-stage pipelines, secret management with CI/CD variables, and Docker-based builds.

## Quick Start

Here's a basic GitLab CI/CD pipeline that runs a psake build:

```yaml
# .gitlab-ci.yml
image: mcr.microsoft.com/powershell:latest

stages:
  - build

build:
  stage: build
  script:
    - pwsh -Command "Install-Module -Name psake -Scope CurrentUser -Force"
    - pwsh -Command "Invoke-psake -buildFile ./psakefile.ps1 -taskList Build"
```

## Docker Images for GitLab CI/CD

GitLab CI/CD runs jobs in Docker containers. Choose an appropriate PowerShell image:

### Option 1: Official PowerShell Image (Recommended)

```yaml
image: mcr.microsoft.com/powershell:7.4-ubuntu-22.04

before_script:
  - pwsh -Command "Install-Module -Name psake -Scope CurrentUser -Force"
```

### Option 2: Windows Server Core (For Windows-Specific Builds)

Requires Windows-based GitLab runners:

```yaml
image: mcr.microsoft.com/powershell:nanoserver-ltsc2022

variables:
  DOCKER_PLATFORM: windows/amd64

before_script:
  - pwsh -Command "Install-Module -Name psake -Scope CurrentUser -Force"
```

### Option 3: Custom Docker Image with psake Pre-Installed

Create a `Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/powershell:7.4-ubuntu-22.04

# Install psake and common dependencies
RUN pwsh -Command "Set-PSRepository -Name PSGallery -InstallationPolicy Trusted; \
    Install-Module -Name psake -Scope AllUsers -Force; \
    Install-Module -Name Pester -Scope AllUsers -Force; \
    Install-Module -Name PSDepend -Scope AllUsers -Force"

WORKDIR /builds
```

Build and push to GitLab Container Registry:

```bash
docker build -t registry.gitlab.com/yourorg/yourproject/psake-build:latest .
docker push registry.gitlab.com/yourorg/yourproject/psake-build:latest
```

Use in `.gitlab-ci.yml`:

```yaml
image: registry.gitlab.com/yourorg/yourproject/psake-build:latest

build:
  script:
    - pwsh -Command "Invoke-psake -taskList Build"
```

## Installing psake in GitLab CI/CD

### Option 1: Install from PowerShell Gallery

```yaml
before_script:
  - pwsh -Command "Install-Module -Name psake -Scope CurrentUser -Force"

build:
  script:
    - pwsh -Command "Invoke-psake -buildFile ./psakefile.ps1 -taskList Build"
```

### Option 2: Install Specific Version

```yaml
before_script:
  - pwsh -Command "Install-Module -Name psake -RequiredVersion 4.9.0 -Scope CurrentUser -Force"
```

### Option 3: Using requirements.psd1 with PSDepend

```yaml
before_script:
  - pwsh -Command "Install-Module -Name PSDepend -Scope CurrentUser -Force"
  - pwsh -Command "Invoke-PSDepend -Path ./requirements.psd1 -Install -Force"

build:
  script:
    - pwsh -Command "Invoke-psake -taskList Build"
```

### Option 4: Cache PowerShell Modules

Speed up pipeline execution by caching modules:

```yaml
variables:
  PSMODULE_CACHE: "$CI_PROJECT_DIR/.psmodules"

cache:
  key: psake-modules
  paths:
    - .psmodules/

before_script:
  - pwsh -Command "
      if (-not (Test-Path '$env:PSMODULE_CACHE')) {
        New-Item -ItemType Directory -Path '$env:PSMODULE_CACHE' -Force | Out-Null
      }
      \$env:PSModulePath = '$env:PSMODULE_CACHE' + [System.IO.Path]::PathSeparator + \$env:PSModulePath;
      if (-not (Get-Module -ListAvailable -Name psake)) {
        Save-Module -Name psake -Path '$env:PSMODULE_CACHE' -Force
      }"
```

## Complete Pipeline Example

Here's a comprehensive GitLab CI/CD pipeline:

```yaml
# .gitlab-ci.yml
image: mcr.microsoft.com/powershell:7.4-ubuntu-22.04

variables:
  BUILD_CONFIGURATION: Release
  PSMODULE_CACHE: "$CI_PROJECT_DIR/.psmodules"

stages:
  - build
  - test
  - deploy

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .psmodules/
    - build/

before_script:
  - pwsh -Command "
      \$ErrorActionPreference = 'Stop';
      Set-PSRepository -Name PSGallery -InstallationPolicy Trusted;
      if (-not (Test-Path '$env:PSMODULE_CACHE')) {
        New-Item -ItemType Directory -Path '$env:PSMODULE_CACHE' -Force | Out-Null
      }
      if (-not (Get-Module -ListAvailable -Name psake)) {
        Save-Module -Name psake -Path '$env:PSMODULE_CACHE' -Force
      }
      if (-not (Get-Module -ListAvailable -Name PSDepend)) {
        Save-Module -Name PSDepend -Path '$env:PSMODULE_CACHE' -Force
      }
      Import-Module psake"

build:
  stage: build
  script:
    - pwsh -Command "
        Invoke-psake -buildFile ./psakefile.ps1 \
          -taskList Build \
          -parameters @{
            Configuration = '$env:BUILD_CONFIGURATION'
            BuildNumber = '$env:CI_PIPELINE_IID'
            BranchName = '$env:CI_COMMIT_REF_NAME'
          }"
  artifacts:
    name: "build-$CI_COMMIT_SHORT_SHA"
    paths:
      - build/
    expire_in: 1 week
  only:
    - branches

test:
  stage: test
  dependencies:
    - build
  script:
    - pwsh -Command "Invoke-psake -taskList Test"
  artifacts:
    when: always
    reports:
      junit: TestResults/*.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
    paths:
      - TestResults/
    expire_in: 30 days
  coverage: '/Total\s+\|\s+(\d+\.?\d*)%/'
  only:
    - branches

deploy:production:
  stage: deploy
  script:
    - pwsh -Command "
        Invoke-psake -taskList Deploy \
          -parameters @{
            Environment = 'Production'
            NuGetApiKey = \$env:NUGET_API_KEY
          }"
  environment:
    name: production
    url: https://www.nuget.org/packages/YourPackage
  dependencies:
    - build
  only:
    - main
  when: manual
```

## Multi-Stage Pipelines

GitLab CI/CD supports sophisticated multi-stage workflows:

```yaml
stages:
  - build
  - test
  - qa
  - production

build:
  stage: build
  script:
    - pwsh -Command "Invoke-psake -taskList Build"
  artifacts:
    paths:
      - build/

unit-tests:
  stage: test
  dependencies:
    - build
  script:
    - pwsh -Command "Invoke-psake -taskList Test"

integration-tests:
  stage: test
  dependencies:
    - build
  script:
    - pwsh -Command "Invoke-psake -taskList IntegrationTest"

deploy:qa:
  stage: qa
  script:
    - pwsh -Command "Invoke-psake -taskList Deploy -parameters @{ Environment = 'QA' }"
  environment:
    name: qa
    url: https://qa.example.com
  only:
    - develop

deploy:production:
  stage: production
  script:
    - pwsh -Command "Invoke-psake -taskList Deploy -parameters @{ Environment = 'Production' }"
  environment:
    name: production
    url: https://example.com
  only:
    - main
  when: manual
```

## Parallel Jobs

Run psake tasks in parallel for faster builds:

```yaml
stages:
  - build
  - test

build:
  stage: build
  script:
    - pwsh -Command "Invoke-psake -taskList Build"
  artifacts:
    paths:
      - build/

test:windows:
  stage: test
  image: mcr.microsoft.com/powershell:nanoserver-ltsc2022
  tags:
    - windows
  script:
    - pwsh -Command "Invoke-psake -taskList Test"
  parallel:
    matrix:
      - POWERSHELL_VERSION: ["7.2", "7.4"]

test:linux:
  stage: test
  image: mcr.microsoft.com/powershell:7.4-ubuntu-22.04
  tags:
    - docker
  script:
    - pwsh -Command "Invoke-psake -taskList Test"

test:macos:
  stage: test
  tags:
    - macos
  script:
    - pwsh -Command "Invoke-psake -taskList Test"
```

## CI/CD Variables and Secrets

GitLab provides CI/CD variables for managing configuration and secrets.

### Setting Up CI/CD Variables

1. Go to **Settings** → **CI/CD** → **Variables**
2. Click **Add variable**
3. Set key (e.g., `NUGET_API_KEY`)
4. Set value
5. Configure options:
   - **Protect variable**: Only available in protected branches
   - **Mask variable**: Hide value in job logs
   - **Expand variable**: Allow variable expansion

### Using Variables in Pipeline

**Method 1: Environment Variables**

```yaml
deploy:
  script:
    - pwsh -Command "Invoke-psake -taskList Deploy"
  variables:
    NUGET_API_KEY: $NUGET_API_KEY
    AZURE_CONNECTION: $AZURE_CONNECTION_STRING
```

In `psakefile.ps1`:

```powershell
Task Deploy {
    $apiKey = $env:NUGET_API_KEY
    if ([string]::IsNullOrEmpty($apiKey)) {
        throw "NUGET_API_KEY environment variable is required"
    }

    dotnet nuget push "*.nupkg" --api-key $apiKey
}
```

**Method 2: Pass as Parameters**

```yaml
deploy:
  script:
    - pwsh -Command "
        Invoke-psake -taskList Deploy \
          -parameters @{
            NuGetApiKey = \$env:NUGET_API_KEY
            Environment = 'Production'
          }"
```

### Using GitLab Secrets Management

For enhanced security, use GitLab's secrets management:

```yaml
deploy:
  script:
    - pwsh -Command "Invoke-psake -taskList Deploy"
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.com
  secrets:
    VAULT_TOKEN:
      vault: production/nuget/api_key@secrets
      file: false
```

### Security Best Practices

- **Mask sensitive variables** to prevent them from appearing in logs
- **Protect variables** for production branches only
- **Use external secrets managers** (HashiCorp Vault, AWS Secrets Manager)
- **Limit variable scope** to specific environments or jobs
- **Rotate credentials regularly** and audit access

## Artifacts and Dependencies

### Publishing Build Artifacts

```yaml
build:
  script:
    - pwsh -Command "Invoke-psake -taskList Build, Pack"
  artifacts:
    name: "build-$CI_COMMIT_REF_NAME-$CI_COMMIT_SHORT_SHA"
    paths:
      - build/*.dll
      - build/*.exe
      - build/*.nupkg
    exclude:
      - build/temp/
    expire_in: 1 week
    when: on_success
```

### Publishing to GitLab Package Registry

**NuGet Packages:**

```yaml
publish:nuget:
  script:
    - pwsh -Command "
        Invoke-psake -taskList Build, Pack;
        Get-ChildItem ./build/*.nupkg | ForEach-Object {
          dotnet nuget push \$_.FullName \
            --source '${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/nuget/index.json' \
            --api-key ${CI_JOB_TOKEN}
        }"
  only:
    - main
```

**PowerShell Modules:**

```yaml
publish:psmodule:
  script:
    - pwsh -Command "
        \$repoParams = @{
          Name = 'GitLabPackages'
          SourceLocation = '${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/nuget/index.json'
          PublishLocation = '${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/nuget/index.json'
          InstallationPolicy = 'Trusted'
        }
        Register-PSRepository @repoParams;

        Invoke-psake -taskList Build;

        Publish-Module -Path ./build/MyModule \
          -Repository GitLabPackages \
          -NuGetApiKey ${CI_JOB_TOKEN}"
```

**Generic Packages:**

```yaml
publish:generic:
  script:
    - pwsh -Command "Invoke-psake -taskList Build"
    - 'curl --header "JOB-TOKEN: $CI_JOB_TOKEN" --upload-file build/myapp.zip "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/generic/myapp/${CI_COMMIT_TAG}/myapp.zip"'
  only:
    - tags
```

## Example psakefile.ps1 for GitLab CI/CD

```powershell
Properties {
    $Configuration = 'Debug'
    $BuildNumber = '0'
    $BranchName = 'unknown'
    $Version = "1.0.$BuildNumber"
    $SrcDir = Join-Path $PSScriptRoot 'src'
    $TestDir = Join-Path $PSScriptRoot 'tests'
    $BuildDir = Join-Path $PSScriptRoot 'build'
    $Environment = 'Development'
    $NuGetApiKey = $null
}

Task Default -depends Build, Test

Task Clean {
    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
    Write-Host "✓ Build directory cleaned" -ForegroundColor Green
}

Task Build -depends Clean {
    Write-Host "Building $Version from $BranchName" -ForegroundColor Cyan

    exec {
        dotnet build $SrcDir `
            -c $Configuration `
            -o $BuildDir `
            /p:Version=$Version
    }

    Write-Host "✓ Build completed successfully" -ForegroundColor Green
}

Task Test -depends Build {
    Write-Host "Running tests..." -ForegroundColor Cyan

    $testResultsDir = Join-Path $BuildDir 'TestResults'
    if (-not (Test-Path $testResultsDir)) {
        New-Item -ItemType Directory -Path $testResultsDir | Out-Null
    }

    exec {
        dotnet test $TestDir `
            -c $Configuration `
            --no-build `
            --logger "junit;LogFilePath=$testResultsDir/results.xml" `
            --results-directory $testResultsDir `
            /p:CollectCoverage=true `
            /p:CoverletOutputFormat=cobertura `
            /p:CoverletOutput="$PSScriptRoot/coverage.xml"
    }

    Write-Host "✓ Tests completed successfully" -ForegroundColor Green
}

Task IntegrationTest -depends Build {
    Write-Host "Running integration tests..." -ForegroundColor Cyan

    exec {
        dotnet test $TestDir `
            -c $Configuration `
            --filter "Category=Integration" `
            --logger "junit"
    }
}

Task Pack -depends Build, Test {
    Write-Host "Creating NuGet packages..." -ForegroundColor Cyan

    exec {
        dotnet pack $SrcDir `
            -c $Configuration `
            -o $BuildDir `
            --no-build `
            /p:Version=$Version `
            /p:PackageVersion=$Version
    }

    Write-Host "✓ Packages created successfully" -ForegroundColor Green
}

Task Deploy -depends Pack {
    if ([string]::IsNullOrEmpty($NuGetApiKey)) {
        throw "NuGetApiKey parameter is required for deployment"
    }

    Write-Host "Deploying to $Environment..." -ForegroundColor Cyan

    $nugetSource = if ($Environment -eq 'Production') {
        'https://api.nuget.org/v3/index.json'
    } else {
        $env:CI_API_V4_URL + '/projects/' + $env:CI_PROJECT_ID + '/packages/nuget/index.json'
    }

    Get-ChildItem "$BuildDir/*.nupkg" | ForEach-Object {
        Write-Host "Publishing $($_.Name)..." -ForegroundColor Yellow

        exec {
            dotnet nuget push $_.FullName `
                --api-key $NuGetApiKey `
                --source $nugetSource
        }
    }

    Write-Host "✓ Deployment completed successfully" -ForegroundColor Green
}

Task Publish -depends Deploy {
    Write-Host "Creating GitLab release..." -ForegroundColor Cyan
    # Additional publishing logic
}
```

## Common Troubleshooting

### PowerShell Module Not Found

**Problem:** `Import-Module: The specified module 'psake' was not loaded`

**Solution:** Ensure psake is installed in the `before_script`:

```yaml
before_script:
  - pwsh -Command "Install-Module -Name psake -Scope CurrentUser -Force -Verbose"
  - pwsh -Command "Get-Module -ListAvailable psake"
```

### Docker Image Pull Authentication

**Problem:** Cannot pull private Docker images

**Solution:** Configure Docker authentication in GitLab CI/CD variables:

```yaml
variables:
  DOCKER_AUTH_CONFIG: $DOCKER_AUTH_CONFIG  # JSON with registry credentials

image: registry.gitlab.com/yourorg/private-image:latest
```

### Build Failures Not Failing Pipeline

**Problem:** psake build fails but pipeline shows success

**Solution:** Use `$ErrorActionPreference = 'Stop'` and `exec`:

```powershell
# In psakefile.ps1
Task Build {
    $ErrorActionPreference = 'Stop'
    exec { dotnet build }  # Will fail on non-zero exit code
}
```

Or check exit codes explicitly:

```yaml
script:
  - pwsh -Command "\$ErrorActionPreference = 'Stop'; Invoke-psake -taskList Build"
```

### Artifacts Not Found

**Problem:** Dependent jobs can't find artifacts from previous jobs

**Solution:** Specify dependencies explicitly:

```yaml
test:
  dependencies:
    - build  # Explicitly depend on build job
  script:
    - pwsh -Command "Invoke-psake -taskList Test"
```

### Windows Runner Issues

**Problem:** Windows-specific builds failing on Linux runners

**Solution:** Use tags to specify Windows runners:

```yaml
windows-build:
  tags:
    - windows
    - powershell
  image: mcr.microsoft.com/powershell:nanoserver-ltsc2022
  script:
    - pwsh -Command "Invoke-psake -taskList Build"
```

### Cache Not Working

**Problem:** Module cache not restoring correctly

**Solution:** Use unique cache keys and verify paths:

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}-psmodules
  paths:
    - .psmodules/
  policy: pull-push  # Default: download and upload
```

### CI/CD Variables Empty

**Problem:** Protected variables not available in pipeline

**Solution:** Ensure branch is protected, or uncheck "Protect variable":

1. **Settings** → **Repository** → **Protected branches**
2. Or in **CI/CD** → **Variables**, uncheck **Protect variable**

## Advanced Patterns

### Dynamic Child Pipelines

Generate pipelines dynamically based on changes:

```yaml
generate-pipeline:
  stage: build
  script:
    - pwsh -File ./scripts/generate-pipeline.ps1 > pipeline.yml
  artifacts:
    paths:
      - pipeline.yml

trigger-pipeline:
  stage: build
  trigger:
    include:
      - artifact: pipeline.yml
        job: generate-pipeline
    strategy: depend
```

### Multi-Project Pipelines

Trigger pipelines in other projects:

```yaml
deploy:downstream:
  stage: deploy
  trigger:
    project: yourorg/downstream-project
    branch: main
    strategy: depend
  variables:
    UPSTREAM_VERSION: $CI_COMMIT_TAG
```

### Scheduled Pipelines

Run psake tasks on a schedule:

1. **CI/CD** → **Schedules** → **New schedule**
2. Set cron schedule (e.g., `0 2 * * *` for daily at 2 AM)

```yaml
nightly-build:
  script:
    - pwsh -Command "Invoke-psake -taskList Build, Test, Deploy"
  only:
    - schedules
```

## See Also

- [Installing psake](/docs/tutorial-basics/installing) - Installation guide
- [Running psake](/docs/tutorial-basics/run-psake) - Basic usage
- [Parameters and Properties](/docs/tutorial-basics/parameters-properties) - Parameterizing builds
- [GitHub Actions](/docs/ci-examples/github-actions) - GitHub Actions integration
- [Azure Pipelines](/docs/ci-examples/azure-pipelines) - Azure DevOps integration
- [.NET Solution Builds](/docs/build-types/dot-net-solution) - .NET build examples
