---
title: "Environment Management"
description: "Manage multiple deployment environments in psake using environment-specific properties, configuration files, and conditional task execution"
---

# Environment Management

Managing multiple environments (development, staging, production) is crucial for reliable software delivery. This guide shows you how to configure psake builds for different environments using properties, configuration files, and conditional task execution.

## Quick Start

Here's a basic environment-aware build:

```powershell
Properties {
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $Configuration = if ($Environment -eq 'prod') { 'Release' } else { 'Debug' }

    # Environment-specific settings
    $ApiUrl = switch ($Environment) {
        'dev'     { 'https://api.dev.example.com' }
        'staging' { 'https://api.staging.example.com' }
        'prod'    { 'https://api.example.com' }
    }
}

Task Build {
    Write-Host "Building for environment: $Environment" -ForegroundColor Green
    Write-Host "  Configuration: $Configuration" -ForegroundColor Gray
    Write-Host "  API URL: $ApiUrl" -ForegroundColor Gray

    exec { dotnet build -c $Configuration /p:ApiUrl=$ApiUrl }
}
```

Run for different environments:

```powershell
# Development (default)
Invoke-psake

# Staging
$env:BUILD_ENV = 'staging'
Invoke-psake

# Production
$env:BUILD_ENV = 'prod'
Invoke-psake
```

## Environment Configuration Patterns

### Pattern 1: Inline Environment Properties

Simple projects with few environment differences:

```powershell
Properties {
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $environmentSettings = @{
        dev = @{
            Configuration = 'Debug'
            DatabaseServer = 'localhost'
            ApiUrl = 'http://localhost:5000'
            EnableTelemetry = $false
            LogLevel = 'Debug'
        }
        staging = @{
            Configuration = 'Release'
            DatabaseServer = 'db-staging.internal'
            ApiUrl = 'https://api-staging.example.com'
            EnableTelemetry = $true
            LogLevel = 'Information'
        }
        prod = @{
            Configuration = 'Release'
            DatabaseServer = 'db-prod.internal'
            ApiUrl = 'https://api.example.com'
            EnableTelemetry = $true
            LogLevel = 'Warning'
        }
    }

    if (-not $environmentSettings.ContainsKey($Environment)) {
        throw "Unknown environment: $Environment"
    }

    $settings = $environmentSettings[$Environment]
    $Configuration = $settings.Configuration
    $DatabaseServer = $settings.DatabaseServer
    $ApiUrl = $settings.ApiUrl
    $EnableTelemetry = $settings.EnableTelemetry
    $LogLevel = $settings.LogLevel
}

Task Build {
    Write-Host "Building for: $Environment" -ForegroundColor Cyan
    Write-Host "  Configuration: $Configuration" -ForegroundColor Gray
    Write-Host "  Database: $DatabaseServer" -ForegroundColor Gray
    Write-Host "  API: $ApiUrl" -ForegroundColor Gray
    Write-Host "  Telemetry: $EnableTelemetry" -ForegroundColor Gray
    Write-Host "  Log Level: $LogLevel" -ForegroundColor Gray

    exec {
        dotnet build -c $Configuration `
            /p:DatabaseServer=$DatabaseServer `
            /p:ApiUrl=$ApiUrl `
            /p:EnableTelemetry=$EnableTelemetry `
            /p:LogLevel=$LogLevel
    }
}
```

### Pattern 2: External Configuration Files

For complex projects with many environment-specific settings:

```
my-project/
├── build/
│   └── config/
│       ├── dev.ps1
│       ├── staging.ps1
│       └── prod.ps1
└── psakefile.ps1
```

**build/config/dev.ps1:**

```powershell
# Development environment configuration

Properties {
    # Build settings
    $Configuration = 'Debug'
    $Platform = 'AnyCPU'
    $SkipTests = $false

    # Infrastructure
    $DatabaseServer = 'localhost'
    $DatabaseName = 'MyApp_Dev'
    $RedisServer = 'localhost:6379'

    # API endpoints
    $ApiBaseUrl = 'http://localhost:5000'
    $AuthServiceUrl = 'http://localhost:5001'

    # Feature flags
    $EnableCaching = $false
    $EnableTelemetry = $false
    $EnableAuthentication = $false

    # Logging
    $LogLevel = 'Debug'
    $LogToFile = $true
    $LogToConsole = $true

    # Deployment
    $DeploymentTarget = 'local'
    $SkipHealthChecks = $true
}
```

**build/config/staging.ps1:**

```powershell
# Staging environment configuration

Properties {
    # Build settings
    $Configuration = 'Release'
    $Platform = 'AnyCPU'
    $SkipTests = $false

    # Infrastructure
    $DatabaseServer = 'db-staging.internal.example.com'
    $DatabaseName = 'MyApp_Staging'
    $RedisServer = 'redis-staging.internal.example.com:6379'

    # API endpoints
    $ApiBaseUrl = 'https://api-staging.example.com'
    $AuthServiceUrl = 'https://auth-staging.example.com'

    # Feature flags
    $EnableCaching = $true
    $EnableTelemetry = $true
    $EnableAuthentication = $true

    # Logging
    $LogLevel = 'Information'
    $LogToFile = $true
    $LogToConsole = $false

    # Deployment
    $DeploymentTarget = 'azure-staging'
    $SkipHealthChecks = $false
    $AzureResourceGroup = 'rg-myapp-staging'
    $AzureWebAppName = 'myapp-staging'
}
```

**build/config/prod.ps1:**

```powershell
# Production environment configuration

Properties {
    # Build settings
    $Configuration = 'Release'
    $Platform = 'AnyCPU'
    $SkipTests = $false

    # Infrastructure
    $DatabaseServer = 'db-prod.internal.example.com'
    $DatabaseName = 'MyApp_Production'
    $RedisServer = 'redis-prod.internal.example.com:6379'

    # API endpoints
    $ApiBaseUrl = 'https://api.example.com'
    $AuthServiceUrl = 'https://auth.example.com'

    # Feature flags
    $EnableCaching = $true
    $EnableTelemetry = $true
    $EnableAuthentication = $true

    # Logging
    $LogLevel = 'Warning'
    $LogToFile = $true
    $LogToConsole = $false

    # Deployment
    $DeploymentTarget = 'azure-production'
    $SkipHealthChecks = $false
    $AzureResourceGroup = 'rg-myapp-prod'
    $AzureWebAppName = 'myapp-prod'
    $RequireApproval = $true
}
```

**psakefile.ps1:**

```powershell
$selectedEnvironment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
$configDirectory = Join-Path $PSScriptRoot 'build/config'
$environmentConfig = Join-Path $configDirectory "${selectedEnvironment}.ps1"

if (-not (Test-Path $environmentConfig)) {
    throw "Environment configuration not found: $environmentConfig. Valid environments: dev, staging, prod"
}

Write-Host "Loading configuration for: $selectedEnvironment" -ForegroundColor Cyan
Include $environmentConfig

Properties {
    $ProjectRoot = $PSScriptRoot
    $BuildDir = Join-Path $ProjectRoot 'build/output'
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $ConfigDir = Join-Path $ProjectRoot 'build/config'
}

Task Default -depends Build

Task Build {
    Write-Host "Building for $Environment environment..." -ForegroundColor Green
    Write-Host "  Configuration: $Configuration" -ForegroundColor Gray
    Write-Host "  Database: $DatabaseServer/$DatabaseName" -ForegroundColor Gray
    Write-Host "  API: $ApiBaseUrl" -ForegroundColor Gray

    exec { dotnet build -c $Configuration }
}

function Deploy-AzureWebApp {
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

Task Deploy -depends Build {
    if ($RequireApproval -and $env:DEPLOY_APPROVED -ne 'true') {
        throw "Deployment to $Environment requires DEPLOY_APPROVED=true"
    }

    switch ($DeploymentTarget) {
        'local' { Copy-Item "$BuildDir/*" -Destination "C:\Deploy\$Environment" -Recurse -Force }
        'azure-staging' { Deploy-AzureWebApp }
        'azure-production' { Deploy-AzureWebApp }
        default { throw "Unknown deployment target: $DeploymentTarget" }
    }
}
```

### Pattern 3: JSON/YAML Configuration Files

Use structured configuration files for complex settings:

**build/config/environments.json:**

```json
{
  "dev": {
    "configuration": "Debug",
    "database": {
      "server": "localhost",
      "name": "MyApp_Dev",
      "port": 5432
    },
    "services": {
      "api": "http://localhost:5000",
      "auth": "http://localhost:5001"
    },
    "features": {
      "caching": false,
      "telemetry": false
    }
  },
  "staging": {
    "configuration": "Release",
    "database": {
      "server": "db-staging.internal.example.com",
      "name": "MyApp_Staging",
      "port": 5432
    },
    "services": {
      "api": "https://api-staging.example.com",
      "auth": "https://auth-staging.example.com"
    },
    "features": {
      "caching": true,
      "telemetry": true
    }
  },
  "prod": {
    "configuration": "Release",
    "database": {
      "server": "db-prod.internal.example.com",
      "name": "MyApp_Production",
      "port": 5432
    },
    "services": {
      "api": "https://api.example.com",
      "auth": "https://auth.example.com"
    },
    "features": {
      "caching": true,
      "telemetry": true
    }
  }
}
```

**build/config/environments.yaml:**

```yaml
dev:
  configuration: Debug
  services:
    api: http://localhost:5000
staging:
  configuration: Release
  services:
    api: https://api-staging.example.com
prod:
  configuration: Release
  services:
    api: https://api.example.com
```

For YAML, install and import `powershell-yaml`, then replace the JSON-loading expression with:

```powershell
Import-Module powershell-yaml
$configurationFile = Join-Path $PSScriptRoot 'build/config/environments.yaml'
$allConfigs = Get-Content $configurationFile -Raw | ConvertFrom-Yaml
```

**psakefile.ps1:**

```powershell
$selectedEnvironment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
$configurationFile = Join-Path $PSScriptRoot 'build/config/environments.json'

if (-not (Test-Path $configurationFile)) {
    throw "Configuration file not found: $configurationFile"
}

$allConfigs = Get-Content $configurationFile -Raw | ConvertFrom-Json
$selectedConfig = $allConfigs.$selectedEnvironment

if ($null -eq $selectedConfig) {
    throw "Configuration for environment '$selectedEnvironment' not found in $configurationFile"
}

Properties {
    $ProjectRoot = $PSScriptRoot
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $ConfigFile = Join-Path $ProjectRoot 'build/config/environments.json'
    $Configuration = $selectedConfig.configuration
    $DatabaseServer = $selectedConfig.database.server
    $DatabaseName = $selectedConfig.database.name
    $DatabasePort = $selectedConfig.database.port
    $ApiUrl = $selectedConfig.services.api
    $AuthUrl = $selectedConfig.services.auth
    $EnableCaching = $selectedConfig.features.caching
    $EnableTelemetry = $selectedConfig.features.telemetry
}

Task Build {
    Write-Host "Building with configuration from: $ConfigFile" -ForegroundColor Green
    Write-Host "  Environment: $Environment" -ForegroundColor Cyan
    Write-Host "  Configuration: $Configuration" -ForegroundColor Gray
    Write-Host "  Database: ${DatabaseServer}:${DatabasePort}/${DatabaseName}" -ForegroundColor Gray
    Write-Host "  API: $ApiUrl" -ForegroundColor Gray

    # Generate configuration file for application
    $appConfig = @{
        ConnectionStrings = @{
            DefaultConnection = "Server=$DatabaseServer;Port=$DatabasePort;Database=$DatabaseName;"
        }
        Services = @{
            ApiBaseUrl = $ApiUrl
            AuthServiceUrl = $AuthUrl
        }
        Features = @{
            EnableCaching = $EnableCaching
            EnableTelemetry = $EnableTelemetry
        }
    }

    $appConfigPath = Join-Path $ProjectRoot "src/appsettings.$Environment.json"
    $appConfig | ConvertTo-Json -Depth 10 | Set-Content $appConfigPath

    exec { dotnet build -c $Configuration }
}
```

## Conditional Task Execution

Execute tasks based on environment:

### Using Preconditions

```powershell
Properties {
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
}

Task RunTests {
    exec { dotnet test }
}

Task DeployToStaging -depends Build -precondition { $Environment -eq 'staging' } {
    Write-Host "Deploying to staging..." -ForegroundColor Green
    # Staging deployment logic
}

Task DeployToProduction -depends Build -precondition { $Environment -eq 'prod' } {
    Write-Host "Deploying to production..." -ForegroundColor Green
    # Production deployment logic

    # Additional production-only verification
    exec { dotnet test --filter Category=Smoke }
}

Task TestOutsideDevelopment -precondition { $Environment -ne 'dev' } {
    exec { dotnet test }
}
```

### Environment-Specific Task Lists

```powershell
Properties {
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
}


Task Build -depends Clean, Compile

Task Dev -depends Build, RunDevServer {
    Write-Host "Development build complete" -ForegroundColor Green
}

Task Staging -depends Build, RunTests, Package, DeployStaging {
    Write-Host "Staging deployment complete" -ForegroundColor Green
}

Task Production -depends Build, RunAllTests, SecurityScan, Package, DeployProduction {
    Write-Host "Production deployment complete" -ForegroundColor Green
}

$environmentTasks = @{
    dev = 'Dev'
    staging = 'Staging'
    prod = 'Production'
}
$selectedEnvironment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
if (-not $environmentTasks.ContainsKey($selectedEnvironment)) {
    throw "Unknown environment: $selectedEnvironment"
}

Task Default -depends $environmentTasks[$selectedEnvironment]
```

### Conditional Build Steps

```powershell
Task Build {
    # Always compile
    exec { dotnet build -c $Configuration }

    # Environment-specific build steps
    if ($Environment -eq 'prod') {
        Write-Host "Running production-specific optimizations..." -ForegroundColor Cyan

        # Minify JavaScript/CSS
        exec { npm run minify }

        # Optimize images
        exec { npm run optimize-images }

        # Generate source maps
        exec { npm run sourcemaps }
    }

    if ($Environment -ne 'dev') {
        Write-Host "Running AOT compilation..." -ForegroundColor Cyan
        exec { dotnet publish -c $Configuration /p:PublishAot=true }
    }

    if ($EnableTelemetry) {
        $env:OTEL_SERVICE_NAME = 'MyApp'
        $env:OTEL_RESOURCE_ATTRIBUTES = "deployment.environment.name=$Environment"
        Write-Host "Configured OpenTelemetry resource attributes" -ForegroundColor Cyan
    }
}
```

## Complete Environment Management Example

Here's a comprehensive example combining all patterns:

**psakefile.ps1:**

```powershell
$selectedEnvironment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
$validEnvironments = @('dev', 'staging', 'prod')
if ($selectedEnvironment -notin $validEnvironments) {
    throw "Invalid environment: $selectedEnvironment. Valid options: $($validEnvironments -join ', ')"
}

$configDirectory = Join-Path $PSScriptRoot 'build/config'
$environmentConfig = Join-Path $configDirectory "${selectedEnvironment}.ps1"
if (-not (Test-Path $environmentConfig)) {
    throw "Environment configuration not found: $environmentConfig"
}

Write-Host "Loading environment configuration: $selectedEnvironment" -ForegroundColor Cyan
Include $environmentConfig

Properties {
    $ProjectRoot = $PSScriptRoot
    $SrcDir = Join-Path $ProjectRoot 'src'
    $BuildDir = Join-Path $ProjectRoot 'build/output'
    $ConfigDir = Join-Path $ProjectRoot 'build/config'
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
}

FormatTaskName {
    param($taskName)
    Write-Host ""
    Write-Host "[$Environment] Executing: $taskName" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Gray
}

Task Default -depends Build

Task Clean {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Green

    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }

    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}

Task Compile -depends Clean {
    Write-Host "Compiling for $Environment..." -ForegroundColor Green
    Write-Host "  Configuration: $Configuration" -ForegroundColor Gray

    exec {
        dotnet build $SrcDir `
            -c $Configuration `
            -o $BuildDir `
            /p:Environment=$Environment
    }
}

Task Test -depends Compile -precondition { -not $SkipTests } {
    Write-Host "Running tests..." -ForegroundColor Green

    exec {
        dotnet test $SrcDir `
            --configuration $Configuration `
            --no-build
    }
}

Task IntegrationTests -depends Test -precondition { $Environment -ne 'dev' } {
    Write-Host "Running integration tests..." -ForegroundColor Green

    exec {
        dotnet test $SrcDir `
            --filter "Category=Integration" `
            --configuration $Configuration
    }
}

Task SecurityScan -depends Compile -precondition { $Environment -eq 'prod' } {
    Write-Host "Running security scan..." -ForegroundColor Green

    # Run security scanning tools
    exec { dotnet tool run security-scan }
}

Task Package -depends Test {
    Write-Host "Creating deployment package..." -ForegroundColor Green

    $packageName = "MyApp-${Environment}-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
    $packagePath = Join-Path $BuildDir $packageName

    Compress-Archive -Path "$BuildDir/*" -DestinationPath $packagePath

    Write-Host "Package created: $packagePath" -ForegroundColor Green
}

function Test-DeploymentHealth {
    if ($SkipHealthChecks) { return }

    $response = Invoke-WebRequest -Uri "$ApiBaseUrl/health" -TimeoutSec 30
    if ($response.StatusCode -ne 200) {
        throw "Health check failed with status: $($response.StatusCode)"
    }
    Write-Host "  Health check passed" -ForegroundColor Green
}

Task Deploy -depends Package {
    if ($RequireApproval -and $env:DEPLOY_APPROVED -ne 'true') {
        throw "Deployment to $Environment requires DEPLOY_APPROVED=true"
    }

    Write-Host "Deploying to $DeploymentTarget..." -ForegroundColor Green

    switch ($DeploymentTarget) {
        'local' {
            Copy-Item "$BuildDir/*" -Destination "C:\Deploy\$Environment" -Recurse -Force
        }
        { $_ -in 'azure-staging', 'azure-production' } {
            $packageFile = Get-ChildItem "$BuildDir/*.zip" | Select-Object -First 1
            if (-not $packageFile) { throw "Deployment package not found in $BuildDir" }

            exec {
                az webapp deploy `
                    --resource-group $AzureResourceGroup `
                    --name $AzureWebAppName `
                    --src-path $packageFile.FullName `
                    --type zip
            }

            if ($DeploymentTarget -eq 'azure-production') {
                Start-Sleep -Seconds 10
                Test-DeploymentHealth
            }
        }
        default { throw "Unknown deployment target: $DeploymentTarget" }
    }

    Write-Host "Deployment to $Environment complete!" -ForegroundColor Green
}

Task HealthCheck -precondition { -not $SkipHealthChecks } {
    Write-Host "Running health checks..." -ForegroundColor Green

    $healthUrl = "$ApiBaseUrl/health"

    try {
        $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Host "  Health check passed" -ForegroundColor Green
        } else {
            throw "Health check failed with status: $($response.StatusCode)"
        }
    }
    catch {
        throw "Health check failed: $_"
    }
}

Task ShowConfig {
    Write-Host ""
    Write-Host "Current Environment Configuration" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Gray
    Write-Host "  Environment:       $Environment" -ForegroundColor White
    Write-Host "  Configuration:     $Configuration" -ForegroundColor Gray
    Write-Host "  Database:          $DatabaseServer/$DatabaseName" -ForegroundColor Gray
    Write-Host "  API Base URL:      $ApiBaseUrl" -ForegroundColor Gray
    Write-Host "  Auth Service:      $AuthServiceUrl" -ForegroundColor Gray
    Write-Host "  Enable Caching:    $EnableCaching" -ForegroundColor Gray
    Write-Host "  Enable Telemetry:  $EnableTelemetry" -ForegroundColor Gray
    Write-Host "  Log Level:         $LogLevel" -ForegroundColor Gray
    Write-Host "  Deployment Target: $DeploymentTarget" -ForegroundColor Gray
    Write-Host "  Skip Tests:        $SkipTests" -ForegroundColor Gray
    Write-Host ("=" * 80) -ForegroundColor Gray
    Write-Host ""
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Multi-Environment Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-dev:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Force

      - name: Build for Development
        shell: pwsh
        run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Build
        env:
          BUILD_ENV: dev

  build-staging:
    runs-on: windows-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Force

      - name: Sign in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS_STAGING }}

      - name: Build and Deploy to Staging
        shell: pwsh
        run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Deploy
        env:
          BUILD_ENV: staging
          DEPLOY_APPROVED: 'true'
  build-production:
    runs-on: windows-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Force

      - name: Sign in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS_PROD }}

      - name: Build and Deploy to Production
        shell: pwsh
        run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Deploy
        env:
          BUILD_ENV: prod
          DEPLOY_APPROVED: 'true'
```

### Azure Pipelines

Use an Azure Resource Manager service connection so credentials never enter the build script:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

stages:
  - stage: Build
    jobs:
      - job: Build
        pool:
          vmImage: windows-latest
        steps:
          - checkout: self
          - pwsh: Install-Module -Name psake -Force
            displayName: Install psake
          - pwsh: Invoke-psake -BuildFile .\psakefile.ps1 -TaskList Build
            displayName: Build
            env:
              BUILD_ENV: dev

  - stage: DeployProduction
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Deploy
        environment: production
        pool:
          vmImage: windows-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: MyProductionServiceConnection
                    scriptType: pscore
                    scriptLocation: inlineScript
                    inlineScript: |
                      Install-Module -Name psake -Force
                      Invoke-psake -BuildFile .\psakefile.ps1 -TaskList Deploy
                  env:
                    BUILD_ENV: prod
                    DEPLOY_APPROVED: 'true'
```

## Best Practices

1. **Use environment variables** - Set `BUILD_ENV` via environment variables, not hardcoded
2. **Validate early** - Check environment names at the start of the build
3. **Externalize configuration** - Use separate config files for complex environments
4. **Default to development** - Make the safest environment (dev) the default
5. **Require approval for production** - Use protected CI environments and a noninteractive approval signal
6. **Use preconditions** - Leverage psake preconditions for environment-specific tasks
7. **Keep secrets separate** - Never put secrets in environment config files (see [Secret Management](/docs/best-practices/secret-management))
8. **Test all environments** - Validate builds for all environments in CI/CD
9. **Document environment settings** - Maintain clear documentation of environment differences
10. **Use consistent naming** - Stick to standard names: dev, staging, prod

## Troubleshooting

### Environment Not Loading

**Problem:** Environment configuration not applied

**Solution:** Check environment variable and file paths:

```powershell
Task Debug:ShowEnvironment {
    $environmentConfig = Join-Path $PSScriptRoot "build/config/$Environment.ps1"
    Write-Host "BUILD_ENV: $($env:BUILD_ENV)" -ForegroundColor Yellow
    Write-Host "Environment: $Environment" -ForegroundColor Yellow
    Write-Host "Config File: $environmentConfig" -ForegroundColor Yellow
    Write-Host "File Exists: $(Test-Path $environmentConfig)" -ForegroundColor Yellow
}
```

### Wrong Configuration Applied

**Problem:** Production settings used in development

**Solution:** Add validation and defaults:

```powershell
Properties {
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }

    # Validate environment
    if ($Environment -notin @('dev', 'staging', 'prod')) {
        throw "Invalid environment: $Environment"
    }

    # Safety check - prevent accidental production deployments
    if ($Environment -eq 'prod' -and -not $env:ALLOW_PROD_DEPLOY) {
        throw "Production deployment requires ALLOW_PROD_DEPLOY=true"
    }
}
```

## See Also

- [Secret Management](/docs/best-practices/secret-management) - Handling secrets and credentials
- [Organizing Large Scripts](/docs/best-practices/organizing-large-scripts) - Modular build organization
- [Parameters and Properties](/docs/tutorial-basics/parameters-properties) - Using psake properties
- [GitHub Actions](/docs/ci-examples/github-actions) - CI/CD integration examples
- [Azure Pipelines](/docs/ci-examples/azure-pipelines) - Azure DevOps integration
