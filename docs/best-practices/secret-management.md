---
title: "Secret Management"
description: "Securely handle secrets and credentials in psake builds using environment variables, Azure Key Vault, AWS Secrets Manager, and secure coding practices"
---

# Secret Management

Proper secret management is critical for secure build automation. This guide shows you how to handle API keys, passwords, certificates, and other sensitive data in psake builds without exposing them in source control or logs.

## Quick Start

Here's a basic secure approach using environment variables:

```powershell
Properties {
    # Never hardcode secrets!
    # BAD: $ApiKey = "sk-1234567890abcdef"

    # GOOD: Read from environment variables
    $ApiKey = $env:API_KEY
    $DatabasePassword = $env:DB_PASSWORD
}

Task Deploy {
    # Validate secrets exist
    if ([string]::IsNullOrEmpty($ApiKey)) {
        throw "API_KEY environment variable is required"
    }

    if ([string]::IsNullOrEmpty($DatabasePassword)) {
        throw "DB_PASSWORD environment variable is required"
    }

    # Use secrets (they won't appear in logs with -errorMessage)
    exec {
        dotnet publish --api-key $ApiKey
    } -errorMessage "Publish failed (credentials redacted)"
}
```

## Secret Management Patterns

### Pattern 1: Environment Variables

The simplest and most common approach:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot

    # API credentials
    $NuGetApiKey = $env:NUGET_API_KEY
    $DockerHubToken = $env:DOCKER_TOKEN
    $GitHubToken = $env:GITHUB_TOKEN

    # Database credentials
    $DbUsername = $env:DB_USERNAME
    $DbPassword = $env:DB_PASSWORD

    # Cloud provider credentials
    $AzureClientId = $env:AZURE_CLIENT_ID
    $AzureClientSecret = $env:AZURE_CLIENT_SECRET
    $AwsAccessKeyId = $env:AWS_ACCESS_KEY_ID
    $AwsSecretAccessKey = $env:AWS_SECRET_ACCESS_KEY

    # Certificate passwords
    $SigningCertPassword = $env:SIGNING_CERT_PASSWORD
}

Task ValidateSecrets {
    Write-Host "Validating required secrets..." -ForegroundColor Green

    $requiredSecrets = @{
        'NUGET_API_KEY' = $NuGetApiKey
        'DB_PASSWORD' = $DbPassword
        'AZURE_CLIENT_SECRET' = $AzureClientSecret
    }

    $missing = @()
    foreach ($secret in $requiredSecrets.GetEnumerator()) {
        if ([string]::IsNullOrEmpty($secret.Value)) {
            $missing += $secret.Key
        }
    }

    if ($missing.Count -gt 0) {
        throw "Missing required secrets: $($missing -join ', ')"
    }

    Write-Host "  All required secrets are present" -ForegroundColor Green
}

Task PublishPackage -depends Build, ValidateSecrets {
    Write-Host "Publishing NuGet package..." -ForegroundColor Green

    # Use the secret without logging it
    $packages = Get-ChildItem "$BuildDir/*.nupkg"

    foreach ($package in $packages) {
        exec {
            dotnet nuget push $package.FullName `
                --api-key $NuGetApiKey `
                --source https://api.nuget.org/v3/index.json
        } -errorMessage "Failed to publish package (check API key)"
    }
}
```

### Pattern 2: Secure Strings (PowerShell)

For Windows-specific scenarios using PowerShell secure strings:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $CredentialsFile = Join-Path $ProjectRoot '.credentials/encrypted.xml'
}

Task SaveCredentials {
    Write-Host "Saving encrypted credentials..." -ForegroundColor Green

    # This only works on Windows with DPAPI
    $credential = Get-Credential -Message "Enter deployment credentials"

    $credentialsDir = Split-Path $CredentialsFile -Parent
    if (-not (Test-Path $credentialsDir)) {
        New-Item -ItemType Directory -Path $credentialsDir | Out-Null
    }

    # Export encrypted (only readable by current user on current machine)
    $credential | Export-Clixml -Path $CredentialsFile

    Write-Host "Credentials saved to: $CredentialsFile" -ForegroundColor Green
    Write-Warning "Add .credentials/ to .gitignore!"
}

Task LoadCredentials {
    if (-not (Test-Path $CredentialsFile)) {
        throw "Credentials file not found: $CredentialsFile. Run SaveCredentials task first."
    }

    # Import encrypted credentials
    $script:DeploymentCredential = Import-Clixml -Path $CredentialsFile

    Write-Host "Loaded credentials from: $CredentialsFile" -ForegroundColor Green
}

Task Deploy -depends Build, LoadCredentials {
    Write-Host "Deploying with saved credentials..." -ForegroundColor Green

    $username = $DeploymentCredential.UserName
    $password = $DeploymentCredential.GetNetworkCredential().Password

    # Use credentials for deployment
    exec {
        msdeploy -verb:sync `
            -source:package="$BuildDir\package.zip" `
            -dest:auto,computerName="https://server.example.com:8172/msdeploy.axd",userName=$username,password=$password `
            -allowUntrusted
    } -errorMessage "Deployment failed"
}
```

### Pattern 3: Azure Key Vault

For Azure-hosted secrets:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $KeyVaultName = $env:AZURE_KEYVAULT_NAME

    # Azure authentication
    $AzureTenantId = $env:AZURE_TENANT_ID
    $AzureClientId = $env:AZURE_CLIENT_ID
    $AzureClientSecret = $env:AZURE_CLIENT_SECRET
}

Task AzureLogin {
    Write-Host "Authenticating with Azure..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($AzureClientSecret)) {
        # Interactive login for local development
        exec { az login }
    } else {
        # Service principal login for CI/CD
        exec {
            az login --service-principal `
                --tenant $AzureTenantId `
                --username $AzureClientId `
                --password $AzureClientSecret
        }
    }

    Write-Host "Azure authentication successful" -ForegroundColor Green
}

Task GetSecretsFromKeyVault -depends AzureLogin {
    Write-Host "Retrieving secrets from Azure Key Vault: $KeyVaultName" -ForegroundColor Green

    if ([string]::IsNullOrEmpty($KeyVaultName)) {
        throw "AZURE_KEYVAULT_NAME environment variable is required"
    }

    # Retrieve secrets from Key Vault
    $script:DatabasePassword = az keyvault secret show `
        --name "DatabasePassword" `
        --vault-name $KeyVaultName `
        --query value -o tsv

    $script:ApiKey = az keyvault secret show `
        --name "ApiKey" `
        --vault-name $KeyVaultName `
        --query value -o tsv

    $script:CertificatePassword = az keyvault secret show `
        --name "SigningCertPassword" `
        --vault-name $KeyVaultName `
        --query value -o tsv

    # Validate retrieved secrets
    if ([string]::IsNullOrEmpty($DatabasePassword)) {
        throw "Failed to retrieve DatabasePassword from Key Vault"
    }

    Write-Host "  Retrieved secrets successfully" -ForegroundColor Green
}

Task Deploy -depends Build, GetSecretsFromKeyVault {
    Write-Host "Deploying with Key Vault secrets..." -ForegroundColor Green

    # Use the secrets retrieved from Key Vault
    $connectionString = "Server=db.example.com;Database=MyApp;User Id=admin;Password=$DatabasePassword;"

    # Update configuration with secrets
    $appSettingsPath = Join-Path $BuildDir 'appsettings.json'
    $appSettings = Get-Content $appSettingsPath | ConvertFrom-Json

    $appSettings.ConnectionStrings.DefaultConnection = $connectionString
    $appSettings.ExternalServices.ApiKey = $ApiKey

    $appSettings | ConvertTo-Json -Depth 10 | Set-Content $appSettingsPath

    # Deploy application
    exec { az webapp deployment source config-zip --src "$BuildDir/package.zip" }
}
```

### Pattern 4: AWS Secrets Manager

For AWS-hosted secrets:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $AwsRegion = if ($env:AWS_REGION) { $env:AWS_REGION } else { 'us-east-1' }
    $SecretsPath = 'myapp/prod'  # Path in Secrets Manager
}

Task VerifyAwsCli {
    try {
        $awsVersion = aws --version
        Write-Host "AWS CLI: $awsVersion" -ForegroundColor Gray
    }
    catch {
        throw "AWS CLI is not installed. Install from https://aws.amazon.com/cli/"
    }
}

Task GetSecretsFromAWS -depends VerifyAwsCli {
    Write-Host "Retrieving secrets from AWS Secrets Manager..." -ForegroundColor Green

    # Get secret from AWS Secrets Manager
    $secretJson = aws secretsmanager get-secret-value `
        --secret-id $SecretsPath `
        --region $AwsRegion `
        --query SecretString `
        --output text

    if ([string]::IsNullOrEmpty($secretJson)) {
        throw "Failed to retrieve secrets from AWS Secrets Manager: $SecretsPath"
    }

    # Parse secrets JSON
    $secrets = $secretJson | ConvertFrom-Json

    # Extract individual secrets
    $script:DatabasePassword = $secrets.DatabasePassword
    $script:ApiKey = $secrets.ApiKey
    $script:EncryptionKey = $secrets.EncryptionKey

    # Validate
    if ([string]::IsNullOrEmpty($DatabasePassword)) {
        throw "DatabasePassword not found in secrets"
    }

    Write-Host "  Retrieved secrets successfully" -ForegroundColor Green
}

Task CreateAwsSecret {
    param(
        [string]$SecretName = 'myapp/prod',
        [string]$SecretValue
    )

    Write-Host "Creating secret in AWS Secrets Manager..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($SecretValue)) {
        # Interactive input
        $SecretValue = Read-Host "Enter secret value" -AsSecureString
        $SecretValue = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretValue)
        )
    }

    # Create or update secret
    try {
        exec {
            aws secretsmanager create-secret `
                --name $SecretName `
                --secret-string $SecretValue `
                --region $AwsRegion
        }
        Write-Host "Secret created: $SecretName" -ForegroundColor Green
    }
    catch {
        # If secret exists, update it
        exec {
            aws secretsmanager update-secret `
                --secret-id $SecretName `
                --secret-string $SecretValue `
                --region $AwsRegion
        }
        Write-Host "Secret updated: $SecretName" -ForegroundColor Green
    }
}

Task Deploy -depends Build, GetSecretsFromAWS {
    Write-Host "Deploying with AWS Secrets..." -ForegroundColor Green

    # Use secrets in deployment
    exec {
        aws deploy create-deployment `
            --application-name MyApp `
            --deployment-config-name CodeDeployDefault.OneAtATime `
            --deployment-group-name Production `
            --s3-location bucket=my-deployments,key=app.zip,bundleType=zip
    }
}
```

### Pattern 5: HashiCorp Vault

For HashiCorp Vault integration:

```powershell
Properties {
    $VaultAddr = $env:VAULT_ADDR  # e.g., https://vault.example.com:8200
    $VaultToken = $env:VAULT_TOKEN
    $VaultSecretsPath = 'secret/data/myapp/prod'
}

Task GetSecretsFromVault {
    Write-Host "Retrieving secrets from HashiCorp Vault..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($VaultAddr)) {
        throw "VAULT_ADDR environment variable is required"
    }

    if ([string]::IsNullOrEmpty($VaultToken)) {
        throw "VAULT_TOKEN environment variable is required"
    }

    # Retrieve secret from Vault
    $headers = @{
        'X-Vault-Token' = $VaultToken
    }

    try {
        $response = Invoke-RestMethod `
            -Uri "$VaultAddr/v1/$VaultSecretsPath" `
            -Method Get `
            -Headers $headers

        $secretData = $response.data.data

        # Extract secrets
        $script:DatabasePassword = $secretData.database_password
        $script:ApiKey = $secretData.api_key
        $script:EncryptionKey = $secretData.encryption_key

        Write-Host "  Retrieved secrets successfully" -ForegroundColor Green
    }
    catch {
        throw "Failed to retrieve secrets from Vault: $_"
    }
}
```

## Security Best Practices

### Never Commit Secrets

**Always add these to .gitignore:**

```gitignore
# Secrets and credentials
*.key
*.pem
*.pfx
*.p12
*.cer
*.crt
.env
.env.local
.env.*.local
secrets.json
appsettings.*.json
*.credentials
.credentials/
*.secret

# Configuration with secrets
config/prod.ps1
config/staging.ps1
**/appsettings.Production.json
**/appsettings.Staging.json

# Build artifacts that may contain secrets
publish/
deploy/
```

### Avoid Logging Secrets

**Bad - Secret appears in logs:**

```powershell
Task Deploy {
    Write-Host "Using API key: $ApiKey" -ForegroundColor Gray  # NEVER DO THIS!
    exec { dotnet publish --api-key $ApiKey }
}
```

**Good - Secrets redacted:**

```powershell
Task Deploy {
    Write-Host "Using API key: [REDACTED]" -ForegroundColor Gray

    # Use custom error message to avoid exposing secrets
    exec {
        dotnet publish --api-key $ApiKey
    } -errorMessage "Publish failed (check API key configuration)"
}
```

### Secret Validation

Always validate secrets exist before using them:

```powershell
function Test-SecretExists {
    param(
        [string]$SecretName,
        [string]$SecretValue
    )

    if ([string]::IsNullOrEmpty($SecretValue)) {
        throw "Required secret '$SecretName' is not set"
    }

    # Optionally validate format
    if ($SecretName -like '*API_KEY' -and $SecretValue.Length -lt 20) {
        Write-Warning "Secret '$SecretName' appears to be invalid (too short)"
    }
}

Task ValidateSecrets {
    Write-Host "Validating secrets..." -ForegroundColor Green

    Test-SecretExists -SecretName 'NUGET_API_KEY' -SecretValue $env:NUGET_API_KEY
    Test-SecretExists -SecretName 'DB_PASSWORD' -SecretValue $env:DB_PASSWORD
    Test-SecretExists -SecretName 'SIGNING_CERT_PASSWORD' -SecretValue $env:SIGNING_CERT_PASSWORD

    Write-Host "  All secrets validated" -ForegroundColor Green
}
```

### Secure Certificate Handling

**For code signing certificates:**

```powershell
Properties {
    $CertificatePath = Join-Path $ProjectRoot 'certs/signing.pfx'
    $CertificatePassword = $env:SIGNING_CERT_PASSWORD
}

Task SignAssemblies -depends Build {
    Write-Host "Signing assemblies..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($CertificatePassword)) {
        throw "SIGNING_CERT_PASSWORD environment variable is required"
    }

    if (-not (Test-Path $CertificatePath)) {
        throw "Certificate not found: $CertificatePath"
    }

    # Sign assemblies
    $assemblies = Get-ChildItem "$BuildDir/*.dll" -Recurse

    foreach ($assembly in $assemblies) {
        exec {
            signtool sign /f $CertificatePath `
                /p $CertificatePassword `
                /t http://timestamp.digicert.com `
                /fd SHA256 `
                $assembly.FullName
        } -errorMessage "Failed to sign $($assembly.Name)"

        Write-Host "  Signed: $($assembly.Name)" -ForegroundColor Gray
    }
}
```

### Cleanup Secrets After Use

```powershell
Task Deploy {
    try {
        # Retrieve secrets
        $apiKey = $env:API_KEY
        $dbPassword = $env:DB_PASSWORD

        # Use secrets
        exec { dotnet publish --api-key $apiKey }

        # Create temporary connection string
        $connectionString = "Server=db;Database=MyApp;Password=$dbPassword;"
        # Use connection string...
    }
    finally {
        # Clear sensitive variables
        $apiKey = $null
        $dbPassword = $null
        $connectionString = $null

        # Force garbage collection
        [System.GC]::Collect()
    }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy with Secrets

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Force

      - name: Deploy
        shell: pwsh
        run: |
          Invoke-psake -buildFile .\psakefile.ps1 -taskList Deploy
        env:
          # Pass secrets as environment variables
          NUGET_API_KEY: ${{ secrets.NUGET_API_KEY }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          SIGNING_CERT_PASSWORD: ${{ secrets.SIGNING_CERT_PASSWORD }}
```

### Azure Pipelines

```yaml
trigger:
  - main

pool:
  vmImage: 'windows-latest'

variables:
  - group: production-secrets  # Variable group with secrets

steps:
  - task: PowerShell@2
    displayName: 'Install psake'
    inputs:
      targetType: 'inline'
      script: 'Install-Module -Name psake -Force'

  - task: PowerShell@2
    displayName: 'Deploy'
    inputs:
      targetType: 'inline'
      script: 'Invoke-psake -buildFile .\psakefile.ps1 -taskList Deploy'
    env:
      NUGET_API_KEY: $(NuGetApiKey)
      DB_PASSWORD: $(DatabasePassword)
      AZURE_CLIENT_SECRET: $(AzureClientSecret)
```

## Complete Secure Build Example

**psakefile.ps1:**

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $BuildDir = Join-Path $ProjectRoot 'build/output'

    # Secrets from environment variables
    $NuGetApiKey = $env:NUGET_API_KEY
    $AzureKeyVaultName = $env:AZURE_KEYVAULT_NAME

    # Flags
    $UseKeyVault = -not [string]::IsNullOrEmpty($AzureKeyVaultName)
}

Task ValidateSecrets {
    Write-Host "Validating secrets configuration..." -ForegroundColor Green

    if ($UseKeyVault) {
        Write-Host "  Using Azure Key Vault: $AzureKeyVaultName" -ForegroundColor Gray

        if ([string]::IsNullOrEmpty($env:AZURE_CLIENT_SECRET)) {
            throw "AZURE_CLIENT_SECRET is required for Key Vault access"
        }
    } else {
        Write-Host "  Using environment variables" -ForegroundColor Gray

        if ([string]::IsNullOrEmpty($NuGetApiKey)) {
            throw "NUGET_API_KEY environment variable is required"
        }
    }

    Write-Host "  Secrets validation passed" -ForegroundColor Green
}

Task GetSecrets -depends ValidateSecrets {
    if ($UseKeyVault) {
        Invoke-psake -taskList GetSecretsFromKeyVault
    } else {
        Write-Host "Using secrets from environment variables" -ForegroundColor Gray
    }
}

Task GetSecretsFromKeyVault {
    Write-Host "Retrieving secrets from Azure Key Vault..." -ForegroundColor Green

    # Login to Azure
    exec {
        az login --service-principal `
            --tenant $env:AZURE_TENANT_ID `
            --username $env:AZURE_CLIENT_ID `
            --password $env:AZURE_CLIENT_SECRET
    }

    # Retrieve secrets
    $script:NuGetApiKey = az keyvault secret show `
        --name "NuGetApiKey" `
        --vault-name $AzureKeyVaultName `
        --query value -o tsv

    Write-Host "  Secrets retrieved successfully" -ForegroundColor Green
}

Task Build {
    Write-Host "Building project..." -ForegroundColor Green
    exec { dotnet build -c Release -o $BuildDir }
}

Task Pack -depends Build {
    Write-Host "Creating NuGet packages..." -ForegroundColor Green
    exec { dotnet pack -c Release -o $BuildDir --no-build }
}

Task Publish -depends Pack, GetSecrets {
    Write-Host "Publishing packages to NuGet..." -ForegroundColor Green

    $packages = Get-ChildItem "$BuildDir/*.nupkg"

    foreach ($package in $packages) {
        Write-Host "  Publishing: $($package.Name)" -ForegroundColor Gray

        exec {
            dotnet nuget push $package.FullName `
                --api-key $NuGetApiKey `
                --source https://api.nuget.org/v3/index.json
        } -errorMessage "Failed to publish package (credentials redacted)"
    }

    # Clear sensitive data
    $script:NuGetApiKey = $null

    Write-Host "Publishing complete" -ForegroundColor Green
}
```

## Troubleshooting

### Secret Not Found

**Problem:** Environment variable not set

**Solution:**

```powershell
Task Debug:ShowSecrets {
    Write-Host "Secret Status:" -ForegroundColor Yellow
    Write-Host "  NUGET_API_KEY: $(if ($env:NUGET_API_KEY) { '[SET]' } else { '[NOT SET]' })"
    Write-Host "  DB_PASSWORD: $(if ($env:DB_PASSWORD) { '[SET]' } else { '[NOT SET]' })"
    Write-Host "  AZURE_CLIENT_SECRET: $(if ($env:AZURE_CLIENT_SECRET) { '[SET]' } else { '[NOT SET]' })"
}
```

### Secrets Appearing in Logs

**Problem:** Sensitive data in build output

**Solution:** Use `-errorMessage` with exec and avoid Write-Host with secret values

### Key Vault Access Denied

**Problem:** Cannot access Azure Key Vault

**Solution:** Check service principal permissions:

```powershell
Task GrantKeyVaultAccess {
    $servicePrincipalId = $env:AZURE_CLIENT_ID

    exec {
        az keyvault set-policy `
            --name $KeyVaultName `
            --spn $servicePrincipalId `
            --secret-permissions get list
    }
}
```

## See Also

- [Environment Management](/docs/best-practices/environment-management) - Managing multiple environments
- [GitHub Actions](/docs/ci-examples/github-actions) - CI/CD with GitHub
- [Azure Pipelines](/docs/ci-examples/azure-pipelines) - CI/CD with Azure DevOps
- [Docker Builds](/docs/build-types/docker) - Container builds with secrets
