---
title: "Azure Pipelines"
description: "Complete guide to integrating psake with Azure DevOps Pipelines for automated builds with multi-stage pipelines, variable groups, and Azure Artifacts"
---

# Azure Pipelines

Azure Pipelines is a cloud-based CI/CD service that's part of Azure DevOps. This guide shows you how to run psake builds in Azure Pipelines, including multi-stage pipelines, secret management with variable groups, and publishing to Azure Artifacts.

## Quick Start

Here's a basic Azure Pipeline that runs a psake build:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'windows-latest'

steps:
  - pwsh: |
      Install-Module -Name psake -Scope CurrentUser -Force
      Invoke-psake -buildFile .\psakefile.ps1 -taskList Build
    displayName: 'Run psake build'
```

## Installing psake in Azure Pipelines

### Option 1: Install from PowerShell Gallery (Recommended)

```yaml
- pwsh: |
    Install-Module -Name psake -Scope CurrentUser -Force
  displayName: 'Install psake'
```

This works on all agent types (Windows, Linux, macOS).

### Option 2: Install Specific Version

```yaml
- pwsh: |
    Install-Module -Name psake -RequiredVersion 4.9.0 -Scope CurrentUser -Force
  displayName: 'Install psake 4.9.0'
```

### Option 3: Using requirements.psd1 with PSDepend

If your project uses a `requirements.psd1` file:

```yaml
- pwsh: |
    Install-Module -Name PSDepend -Scope CurrentUser -Force
    Invoke-PSDepend -Path ./requirements.psd1 -Install -Force
  displayName: 'Install dependencies with PSDepend'
```

Your `requirements.psd1`:

```powershell
@{
    psake = @{
        Version = '4.9.0'
    }
    Pester = @{
        Version = '5.5.0'
    }
}
```

### Option 4: Cache PowerShell Modules

Speed up builds by caching the PowerShell modules directory:

```yaml
- task: Cache@2
  inputs:
    key: 'psake | "$(Agent.OS)" | requirements.psd1'
    restoreKeys: |
      psake | "$(Agent.OS)"
      psake
    path: $(Pipeline.Workspace)/.psmodules
  displayName: 'Cache PowerShell modules'

- pwsh: |
    $modulePath = "$(Pipeline.Workspace)/.psmodules"
    if (-not (Test-Path $modulePath)) {
      New-Item -ItemType Directory -Path $modulePath -Force | Out-Null
    }

    if ($env:PSModulePath -notlike "*$modulePath*") {
      $env:PSModulePath = "$modulePath$([System.IO.Path]::PathSeparator)$env:PSModulePath"
    }

    if (-not (Get-Module -ListAvailable -Name psake)) {
      Save-Module -Name psake -Path $modulePath -Force
    }

    Import-Module psake
  displayName: 'Setup psake with caching'
```

## Complete Pipeline Example

Here's a comprehensive pipeline demonstrating psake integration:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop
  tags:
    include:
      - v*

pr:
  branches:
    include:
      - main

variables:
  buildConfiguration: 'Release'

pool:
  vmImage: 'windows-latest'

stages:
  - stage: Build
    displayName: 'Build and Test'
    jobs:
      - job: BuildJob
        displayName: 'Build with psake'
        steps:
          - checkout: self
            fetchDepth: 0  # Full history for versioning
            displayName: 'Checkout source code'

          - task: Cache@2
            inputs:
              key: 'psmodules | "$(Agent.OS)" | requirements.psd1'
              path: $(Pipeline.Workspace)/.psmodules
            displayName: 'Cache PowerShell modules'

          - pwsh: |
              Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
              Install-Module -Name psake -Scope CurrentUser -Force
              Install-Module -Name PSDepend -Scope CurrentUser -Force

              if (Test-Path ./requirements.psd1) {
                Invoke-PSDepend -Path ./requirements.psd1 -Install -Force
              }
            displayName: 'Install psake and dependencies'

          - pwsh: |
              Invoke-psake -buildFile .\psakefile.ps1 `
                -taskList Build, Test `
                -parameters @{
                  Configuration = "$(buildConfiguration)"
                  BuildNumber = "$(Build.BuildNumber)"
                  BranchName = "$(Build.SourceBranchName)"
                }
            displayName: 'Run psake build and test'
            env:
              NUGET_API_KEY: $(NuGetApiKey)  # From variable group

          - task: PublishTestResults@2
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: 'NUnit'
              testResultsFiles: '**/TestResults/*.xml'
              mergeTestResults: true
              testRunTitle: 'Unit Tests'
            displayName: 'Publish test results'

          - task: PublishCodeCoverageResults@2
            condition: succeededOrFailed()
            inputs:
              codeCoverageTool: 'JaCoCo'
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/**/coverage.xml'
            displayName: 'Publish code coverage'

          - publish: $(System.DefaultWorkingDirectory)/build
            artifact: BuildOutput
            displayName: 'Publish build artifacts'

  - stage: Deploy
    displayName: 'Deploy to Production'
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployJob
        displayName: 'Deploy with psake'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: BuildOutput
                  displayName: 'Download build artifacts'

                - pwsh: |
                    Install-Module -Name psake -Scope CurrentUser -Force
                  displayName: 'Install psake'

                - pwsh: |
                    Invoke-psake -buildFile .\psakefile.ps1 `
                      -taskList Deploy `
                      -parameters @{
                        Environment = 'Production'
                        DeploymentPath = "$(Pipeline.Workspace)/BuildOutput"
                      }
                  displayName: 'Run psake deployment'
                  env:
                    AZURE_CONNECTION_STRING: $(AzureConnectionString)
```

## Multi-Stage Pipelines

Azure Pipelines supports multi-stage pipelines for complex workflows:

```yaml
stages:
  - stage: Build
    jobs:
      - job: CompileAndTest
        steps:
          - pwsh: |
              Invoke-psake -taskList Build, Test
            displayName: 'Build and Test'

  - stage: QA
    dependsOn: Build
    condition: succeeded()
    jobs:
      - job: DeployToQA
        steps:
          - pwsh: |
              Invoke-psake -taskList Deploy -parameters @{ Environment = 'QA' }
            displayName: 'Deploy to QA'

  - stage: Production
    dependsOn: QA
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProduction
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - pwsh: |
                    Invoke-psake -taskList Deploy -parameters @{ Environment = 'Production' }
                  displayName: 'Deploy to Production'
```

## Cross-Platform Matrix Builds

Run psake builds across multiple operating systems and PowerShell versions:

```yaml
trigger:
  - main

strategy:
  matrix:
    Windows_PS7:
      imageName: 'windows-latest'
      pwshVersion: '7.4'
    Linux_PS7:
      imageName: 'ubuntu-latest'
      pwshVersion: '7.4'
    macOS_PS7:
      imageName: 'macOS-latest'
      pwshVersion: '7.4'
    Windows_PS51:
      imageName: 'windows-2019'
      pwshVersion: '5.1'

pool:
  vmImage: $(imageName)

steps:
  - pwsh: |
      Write-Host "OS: $(imageName)"
      Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)"
    displayName: 'Display environment info'

  - pwsh: |
      Install-Module -Name psake -Scope CurrentUser -Force
    displayName: 'Install psake'

  - pwsh: |
      Invoke-psake -buildFile .\psakefile.ps1 -taskList Build, Test
    displayName: 'Run psake build'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: '$(System.DefaultWorkingDirectory)/build'
      artifactName: 'build-$(imageName)-ps$(pwshVersion)'
    displayName: 'Upload artifacts'
```

## Variable Groups and Secrets

Azure Pipelines provides variable groups for managing secrets and configuration.

### Creating Variable Groups

1. Go to **Pipelines** → **Library** in Azure DevOps
2. Click **+ Variable group**
3. Name your group (e.g., `BuildSecrets`)
4. Add variables:
   - `NuGetApiKey` (click lock icon to mark as secret)
   - `AzureConnectionString` (secret)
   - `Environment` (plain text)
5. Save the variable group

### Using Variable Groups in Pipelines

```yaml
variables:
  - group: BuildSecrets  # Reference the variable group
  - name: buildConfiguration
    value: 'Release'

steps:
  - pwsh: |
      Invoke-psake -buildFile .\psakefile.ps1 `
        -taskList Deploy `
        -parameters @{
          NuGetApiKey = $env:NUGET_API_KEY
          Environment = $env:ENVIRONMENT
        }
    displayName: 'Deploy with secrets'
    env:
      NUGET_API_KEY: $(NuGetApiKey)
      ENVIRONMENT: $(Environment)
      AZURE_CONNECTION_STRING: $(AzureConnectionString)
```

### Using Azure Key Vault

For enhanced security, integrate with Azure Key Vault:

```yaml
variables:
  - group: BuildSecrets
  - name: KeyVaultName
    value: 'my-keyvault'

steps:
  - task: AzureKeyVault@2
    inputs:
      azureSubscription: 'Azure Subscription Connection'
      KeyVaultName: '$(KeyVaultName)'
      SecretsFilter: '*'
      RunAsPreJob: true
    displayName: 'Fetch secrets from Key Vault'

  - pwsh: |
      # Secrets are now available as environment variables
      Invoke-psake -taskList Deploy
    displayName: 'Deploy with Key Vault secrets'
    env:
      NUGET_API_KEY: $(NuGetApiKey)  # From Key Vault
```

### Security Best Practices

- **Mark secrets as secret** in variable groups (use the lock icon)
- **Use Azure Key Vault** for production secrets
- **Limit access** with variable group permissions
- **Use service connections** for Azure/AWS credentials instead of manual secrets
- **Enable Azure DevOps auditing** to track secret access

## Publishing to Azure Artifacts

### Publishing NuGet Packages

```yaml
steps:
  - pwsh: |
      Invoke-psake -taskList Build, Pack
    displayName: 'Build and pack NuGet packages'

  - task: NuGetCommand@2
    inputs:
      command: 'push'
      packagesToPush: '$(Build.SourcesDirectory)/build/*.nupkg'
      nuGetFeedType: 'internal'
      publishVstsFeed: 'MyProject/MyFeed'
    displayName: 'Publish to Azure Artifacts feed'
```

### Publishing PowerShell Modules

```yaml
steps:
  - pwsh: |
      Invoke-psake -taskList Build, Test
    displayName: 'Build PowerShell module'

  - task: PowerShell@2
    inputs:
      targetType: 'inline'
      script: |
        $apiKey = $env:ARTIFACTS_PAT
        Register-PSRepository -Name AzureArtifacts `
          -SourceLocation "https://pkgs.dev.azure.com/myorg/_packaging/myfeed/nuget/v2" `
          -PublishLocation "https://pkgs.dev.azure.com/myorg/_packaging/myfeed/nuget/v2" `
          -InstallationPolicy Trusted

        Publish-Module -Path ./build/MyModule -Repository AzureArtifacts -NuGetApiKey $apiKey
    displayName: 'Publish module to Azure Artifacts'
    env:
      ARTIFACTS_PAT: $(System.AccessToken)
```

### Publishing Universal Packages

```yaml
steps:
  - pwsh: |
      Invoke-psake -taskList Build
    displayName: 'Build application'

  - task: UniversalPackages@0
    inputs:
      command: 'publish'
      publishDirectory: '$(Build.SourcesDirectory)/build'
      feedsToUsePublish: 'internal'
      vstsFeedPublish: 'MyProject/MyFeed'
      vstsFeedPackagePublish: 'myapp'
      versionOption: 'patch'
    displayName: 'Publish Universal Package'
```

## Example psakefile.ps1 for Azure Pipelines

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
}

Task Default -depends Build, Test

Task Clean {
    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
    Write-Host "Build directory cleaned: $BuildDir" -ForegroundColor Green
}

Task Build -depends Clean {
    Write-Host "Building version $Version from branch $BranchName" -ForegroundColor Cyan

    exec {
        dotnet build $SrcDir `
            -c $Configuration `
            -o $BuildDir `
            /p:Version=$Version `
            /p:AssemblyVersion=$Version
    }
}

Task Test -depends Build {
    Write-Host "Running tests..." -ForegroundColor Cyan

    exec {
        dotnet test $TestDir `
            -c $Configuration `
            --no-build `
            --logger "trx;LogFileName=TestResults.xml" `
            --results-directory "$BuildDir/TestResults" `
            /p:CollectCoverage=true `
            /p:CoverletOutputFormat=cobertura `
            /p:CoverletOutput="$BuildDir/coverage.xml"
    }
}

Task Pack -depends Build {
    Write-Host "Creating NuGet packages..." -ForegroundColor Cyan

    exec {
        dotnet pack $SrcDir `
            -c $Configuration `
            -o $BuildDir `
            --no-build `
            /p:Version=$Version
    }
}

Task Deploy -depends Pack {
    $apiKey = $env:NUGET_API_KEY
    if ([string]::IsNullOrEmpty($apiKey)) {
        throw "NUGET_API_KEY environment variable is required for deployment"
    }

    Write-Host "Deploying to $Environment environment..." -ForegroundColor Cyan

    if ($Environment -eq 'Production') {
        # Deploy to NuGet.org
        Get-ChildItem "$BuildDir/*.nupkg" | ForEach-Object {
            exec {
                dotnet nuget push $_.FullName `
                    --api-key $apiKey `
                    --source https://api.nuget.org/v3/index.json
            }
        }
    }
    else {
        Write-Host "Skipping deployment for non-production environment: $Environment"
    }
}

Task Publish -depends Deploy {
    Write-Host "Publishing artifacts to Azure Artifacts..." -ForegroundColor Cyan
    # Additional publishing logic here
}
```

## Common Troubleshooting

### psake Module Not Found on Agent

**Problem:** `Import-Module: The specified module 'psake' was not loaded`

**Solution:** Ensure you're using `pwsh` (PowerShell Core) and install with `-Scope CurrentUser`:

```yaml
- pwsh: |
    Install-Module -Name psake -Scope CurrentUser -Force -Verbose
    Get-Module -ListAvailable psake
  displayName: 'Install psake with verbose output'
```

### Build Fails but Pipeline Shows Success

**Problem:** psake build fails but Azure Pipeline doesn't detect the failure

**Solution:** Use the `exec` function in psake for external commands:

```powershell
Task Build {
    # This will fail the build on non-zero exit codes
    exec { dotnet build }
}
```

Or explicitly check for errors:

```yaml
- pwsh: |
    Invoke-psake -buildFile .\psakefile.ps1
    if ($LASTEXITCODE -ne 0) {
      Write-Error "psake build failed"
      exit $LASTEXITCODE
    }
  displayName: 'Run psake with error checking'
```

### Variable Group Not Available

**Problem:** Variables from variable group are empty

**Solution:** Reference the variable group at the pipeline or stage level:

```yaml
# At pipeline level
variables:
  - group: BuildSecrets

# Or at stage level
stages:
  - stage: Build
    variables:
      - group: BuildSecrets
```

### Secrets Not Passed to Child Processes

**Problem:** Environment variables with secrets aren't available in psake

**Solution:** Explicitly pass them using the `env` parameter:

```yaml
- pwsh: |
    Invoke-psake -taskList Deploy
  env:
    NUGET_API_KEY: $(NuGetApiKey)  # Explicitly map to environment variable
  displayName: 'Deploy with secrets'
```

### Agent Pool Capacity Issues

**Problem:** Builds queued for a long time waiting for agents

**Solution:** Use Microsoft-hosted agents or scale your self-hosted agent pool:

```yaml
pool:
  vmImage: 'windows-latest'  # Microsoft-hosted agent
  # Or for self-hosted:
  # name: 'Default'
  # demands:
  #   - Agent.OS -equals Windows_NT
```

### Path Issues with Self-Hosted Agents

**Problem:** Paths don't resolve correctly on self-hosted agents

**Solution:** Use PowerShell's built-in path cmdlets:

```powershell
Properties {
    # Use cross-platform path construction
    $BuildDir = Join-Path $PSScriptRoot 'build'
    $OutputPath = Join-Path $BuildDir 'bin'
}
```

## Advanced Patterns

### Parameterized Builds with Runtime Parameters

```yaml
parameters:
  - name: buildConfiguration
    displayName: 'Build Configuration'
    type: string
    default: 'Release'
    values:
      - Debug
      - Release
  - name: taskList
    displayName: 'psake Tasks'
    type: string
    default: 'Build, Test'

steps:
  - pwsh: |
      Invoke-psake -buildFile .\psakefile.ps1 `
        -taskList "${{ parameters.taskList }}" `
        -parameters @{ Configuration = "${{ parameters.buildConfiguration }}" }
    displayName: 'Run psake with parameters'
```

### Template-Based Reusable Pipelines

Create `templates/psake-build.yml`:

```yaml
# templates/psake-build.yml
parameters:
  - name: taskList
    type: string
    default: 'Build, Test'
  - name: configuration
    type: string
    default: 'Release'

steps:
  - pwsh: |
      Install-Module -Name psake -Scope CurrentUser -Force
    displayName: 'Install psake'

  - pwsh: |
      Invoke-psake -buildFile .\psakefile.ps1 `
        -taskList "${{ parameters.taskList }}" `
        -parameters @{ Configuration = "${{ parameters.configuration }}" }
    displayName: 'Run psake ${{ parameters.taskList }}'
```

Use the template:

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'windows-latest'

jobs:
  - job: BuildAndTest
    steps:
      - template: templates/psake-build.yml
        parameters:
          taskList: 'Build, Test'
          configuration: 'Release'
```

### Conditional Deployment Based on Branch

```yaml
stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - pwsh: Invoke-psake -taskList Build
            displayName: 'Build'

  - stage: DeployDev
    condition: eq(variables['Build.SourceBranch'], 'refs/heads/develop')
    jobs:
      - job: DeployToDevJob
        steps:
          - pwsh: |
              Invoke-psake -taskList Deploy -parameters @{ Environment = 'Development' }

  - stage: DeployProd
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProdJob
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - pwsh: |
                    Invoke-psake -taskList Deploy -parameters @{ Environment = 'Production' }
```

## See Also

- [Installing psake](/docs/tutorial-basics/installing) - Installation guide
- [Running psake](/docs/tutorial-basics/run-psake) - Basic usage
- [Parameters and Properties](/docs/tutorial-basics/parameters-properties) - Parameterizing builds
- [GitHub Actions](/docs/ci-examples/github-actions) - GitHub Actions integration
- [.NET Solution Builds](/docs/build-types/dot-net-solution) - .NET build examples
