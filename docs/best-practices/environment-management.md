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

    # Configuration mode
    $Configuration = switch ($Environment) {
        'dev'     { 'Debug' }
        'staging' { 'Release' }
        'prod'    { 'Release' }
    }

    # Database connection strings
    $DatabaseServer = switch ($Environment) {
        'dev'     { 'localhost' }
        'staging' { 'db-staging.internal' }
        'prod'    { 'db-prod.internal' }
    }

    # API endpoints
    $ApiUrl = switch ($Environment) {
        'dev'     { 'http://localhost:5000' }
        'staging' { 'https://api-staging.example.com' }
        'prod'    { 'https://api.example.com' }
    }

    # Feature flags
    $EnableTelemetry = switch ($Environment) {
        'dev'     { $false }
        'staging' { $true }
        'prod'    { $true }
    }

    # Logging level
    $LogLevel = switch ($Environment) {
        'dev'     { 'Debug' }
        'staging' { 'Information' }
        'prod'    { 'Warning' }
    }
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
Properties {
    $ProjectRoot = $PSScriptRoot
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $ConfigDir = Join-Path $ProjectRoot 'build/config'
}

# Load environment-specific configuration
$envConfig = Join-Path $ConfigDir "${Environment}.ps1"

if (-not (Test-Path $envConfig)) {
    throw "Environment configuration not found: $envConfig. Valid environments: dev, staging, prod"
}

Write-Host "Loading configuration for: $Environment" -ForegroundColor Cyan
Include $envConfig

Task Default -depends Build

Task Build {
    Write-Host "Building for $Environment environment..." -ForegroundColor Green
    Write-Host "  Configuration: $Configuration" -ForegroundColor Gray
    Write-Host "  Database: $DatabaseServer/$DatabaseName" -ForegroundColor Gray
    Write-Host "  API: $ApiBaseUrl" -ForegroundColor Gray

    exec { dotnet build -c $Configuration }
}

Task Deploy -depends Build {
    if ($RequireApproval) {
        $confirmation = Read-Host "Deploy to $Environment? This is a PRODUCTION environment! (yes/no)"
        if ($confirmation -ne 'yes') {
            Write-Host "Deployment cancelled" -ForegroundColor Yellow
            return
        }
    }

    switch ($DeploymentTarget) {
        'local' { Invoke-psake -taskList Deploy:Local }
        'azure-staging' { Invoke-psake -taskList Deploy:Azure }
        'azure-production' { Invoke-psake -taskList Deploy:Azure }
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

**psakefile.ps1:**

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
    $ConfigFile = Join-Path $ProjectRoot 'build/config/environments.json'
}

# Load and parse configuration
if (-not (Test-Path $ConfigFile)) {
    throw "Configuration file not found: $ConfigFile"
}

$allConfigs = Get-Content $ConfigFile | ConvertFrom-Json
$config = $allConfigs.$Environment

if ($null -eq $config) {
    throw "Configuration for environment '$Environment' not found in $ConfigFile"
}

# Extract configuration values
Properties {
    $Configuration = $config.configuration
    $DatabaseServer = $config.database.server
    $DatabaseName = $config.database.name
    $DatabasePort = $config.database.port
    $ApiUrl = $config.services.api
    $AuthUrl = $config.services.auth
    $EnableCaching = $config.features.caching
    $EnableTelemetry = $config.features.telemetry
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

    $appConfigPath = Join-Path $ProjectRoot 'src/appsettings.$Environment.json'
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

Task SkipTestsInDev -precondition { $Environment -ne 'dev' } {
    Invoke-psake -taskList RunTests
}
```

### Environment-Specific Task Lists

```powershell
Properties {
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }
}

Task Default -depends Build

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

# Automatically select task based on environment
Task Auto {
    switch ($Environment) {
        'dev'     { Invoke-psake -taskList Dev }
        'staging' { Invoke-psake -taskList Staging }
        'prod'    { Invoke-psake -taskList Production }
        default   { throw "Unknown environment: $Environment" }
    }
}
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
        Write-Host "Instrumenting for telemetry..." -ForegroundColor Cyan
        # Add telemetry instrumentation
    }
}
```

## Complete Environment Management Example

Here's a comprehensive example combining all patterns:

**psakefile.ps1:**

```powershell
Properties {
    # Base properties
    $ProjectRoot = $PSScriptRoot
    $SrcDir = Join-Path $ProjectRoot 'src'
    $BuildDir = Join-Path $ProjectRoot 'build/output'
    $ConfigDir = Join-Path $ProjectRoot 'build/config'

    # Environment detection
    $Environment = if ($env:BUILD_ENV) { $env:BUILD_ENV } else { 'dev' }

    # Validate environment
    $validEnvironments = @('dev', 'staging', 'prod')
    if ($Environment -notin $validEnvironments) {
        throw "Invalid environment: $Environment. Valid options: $($validEnvironments -join ', ')"
    }
}

# Load environment-specific configuration
$envConfigFile = Join-Path $ConfigDir "${Environment}.ps1"
if (Test-Path $envConfigFile) {
    Write-Host "Loading environment configuration: $Environment" -ForegroundColor Cyan
    Include $envConfigFile
} else {
    throw "Environment configuration not found: $envConfigFile"
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

Task Deploy -depends Package {
    if ($RequireApproval) {
        Write-Warning "Deploying to $Environment environment!"
        $confirmation = Read-Host "Are you sure you want to continue? (yes/no)"

        if ($confirmation -ne 'yes') {
            Write-Host "Deployment cancelled" -ForegroundColor Yellow
            return
        }
    }

    Write-Host "Deploying to $DeploymentTarget..." -ForegroundColor Green

    switch ($DeploymentTarget) {
        'local' {
            Copy-Item "$BuildDir/*" -Destination "C:\Deploy\$Environment" -Recurse -Force
        }
        'azure-staging' {
            exec {
                az webapp deployment source config-zip `
                    --resource-group $AzureResourceGroup `
                    --name $AzureWebAppName `
                    --src "$BuildDir/*.zip"
            }
        }
        'azure-production' {
            exec {
                az webapp deployment source config-zip `
                    --resource-group $AzureResourceGroup `
                    --name $AzureWebAppName `
                    --src "$BuildDir/*.zip"
            }

            # Run health checks after production deployment
            Start-Sleep -Seconds 10
            Invoke-psake -taskList HealthCheck
        }
        default {
            throw "Unknown deployment target: $DeploymentTarget"
        }
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

      - name: Build and Deploy to Staging
        shell: pwsh
        run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Deploy
        env:
          BUILD_ENV: staging
          AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS_STAGING }}

  build-production:
    runs-on: windows-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Force

      - name: Build and Deploy to Production
        shell: pwsh
        run: Invoke-psake -buildFile .\psakefile.ps1 -taskList Deploy
        env:
          BUILD_ENV: prod
          AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS_PROD }}
```

## Best Practices

1. **Use environment variables** - Set `BUILD_ENV` via environment variables, not hardcoded
2. **Validate early** - Check environment names at the start of the build
3. **Externalize configuration** - Use separate config files for complex environments
4. **Default to development** - Make the safest environment (dev) the default
5. **Require approval for production** - Add confirmation prompts for production deployments
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
    Write-Host "BUILD_ENV: $($env:BUILD_ENV)" -ForegroundColor Yellow
    Write-Host "Environment: $Environment" -ForegroundColor Yellow
    Write-Host "Config File: $envConfigFile" -ForegroundColor Yellow
    Write-Host "File Exists: $(Test-Path $envConfigFile)" -ForegroundColor Yellow
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
