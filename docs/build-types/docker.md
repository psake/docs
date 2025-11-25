---
title: "Docker Container Builds"
description: "Build, tag, and deploy Docker containers using psake with multi-stage builds, registry publishing, and Docker Compose orchestration"
---

# Docker Container Builds

psake can orchestrate Docker-based build workflows, providing a consistent PowerShell automation layer for containerized applications. This guide shows you how to build Docker images, use multi-stage builds, push to registries, and integrate with Docker Compose.

## Quick Start

Here's a basic psake build script for Docker:

```powershell
Properties {
    $ImageName = 'myapp'
    $ImageTag = 'latest'
    $ContainerName = 'myapp-container'
}

Task Default -depends Build

Task Build {
    Write-Host "Building Docker image..." -ForegroundColor Green
    exec { docker build -t "${ImageName}:${ImageTag}" . }
}

Task Run -depends Build {
    Write-Host "Running Docker container..." -ForegroundColor Green
    exec { docker run -d --name $ContainerName -p 8080:80 "${ImageName}:${ImageTag}" }
}

Task Stop {
    Write-Host "Stopping container..." -ForegroundColor Green
    exec { docker stop $ContainerName } -errorMessage "Container not running"
    exec { docker rm $ContainerName } -errorMessage "Container not found"
}
```

Run the build:

```powershell
Invoke-psake -buildFile .\psakefile.ps1
```

## Complete Docker Build Example

Here's a comprehensive psakefile.ps1 for Docker-based builds:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $DockerfilePath = Join-Path $ProjectRoot 'Dockerfile'
    $DockerComposeFile = Join-Path $ProjectRoot 'docker-compose.yml'

    # Image configuration
    $ImageName = 'myapp'
    $ImageTag = if ($env:BUILD_NUMBER) { "1.0.$env:BUILD_NUMBER" } else { 'latest' }
    $ImageFullName = "${ImageName}:${ImageTag}"

    # Registry configuration
    $Registry = 'docker.io'
    $RegistryUsername = $env:DOCKER_USERNAME
    $RegistryToken = $env:DOCKER_TOKEN
    $RegistryImage = "${Registry}/${RegistryUsername}/${ImageName}:${ImageTag}"

    # Container configuration
    $ContainerName = 'myapp-container'
    $ContainerPort = 8080
    $HostPort = 8080

    # Build configuration
    $BuildArgs = @{}
    $Platform = 'linux/amd64'
    $NoCache = $false
}

FormatTaskName {
    param($taskName)
    Write-Host "Executing task: $taskName" -ForegroundColor Cyan
}

Task Default -depends Build

Task Verify {
    Write-Host "Verifying Docker installation..." -ForegroundColor Green

    try {
        $dockerVersion = docker --version
        Write-Host "  Docker: $dockerVersion" -ForegroundColor Gray
    }
    catch {
        throw "Docker is not installed or not in PATH. Install from https://docker.com/"
    }

    if (-not (Test-Path $DockerfilePath)) {
        throw "Dockerfile not found at: $DockerfilePath"
    }
}

Task Clean {
    Write-Host "Cleaning up Docker resources..." -ForegroundColor Green

    # Stop and remove container if exists
    $container = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
    if ($container -eq $ContainerName) {
        Write-Host "  Stopping container: $ContainerName" -ForegroundColor Gray
        exec { docker stop $ContainerName } -errorMessage "Failed to stop container"
        exec { docker rm $ContainerName } -errorMessage "Failed to remove container"
    }

    # Remove dangling images
    $danglingImages = docker images -f "dangling=true" -q 2>$null
    if ($danglingImages) {
        Write-Host "  Removing dangling images" -ForegroundColor Gray
        docker rmi $danglingImages 2>$null
    }
}

Task Build -depends Verify {
    Write-Host "Building Docker image: $ImageFullName" -ForegroundColor Green

    $buildCmd = "docker build"

    # Add platform if specified
    if ($Platform) {
        $buildCmd += " --platform $Platform"
    }

    # Add no-cache flag if specified
    if ($NoCache) {
        $buildCmd += " --no-cache"
    }

    # Add build args
    foreach ($key in $BuildArgs.Keys) {
        $buildCmd += " --build-arg ${key}=$($BuildArgs[$key])"
    }

    # Add tag and context
    $buildCmd += " -t $ImageFullName ."

    Write-Host "  Build command: $buildCmd" -ForegroundColor Gray
    exec { Invoke-Expression $buildCmd }

    Write-Host "Docker image built successfully: $ImageFullName" -ForegroundColor Green
}

Task BuildNoCache {
    $script:NoCache = $true
    Invoke-psake -taskList Build
}

Task Tag -depends Build {
    Write-Host "Tagging image for registry..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($RegistryUsername)) {
        throw "DOCKER_USERNAME environment variable is required"
    }

    exec { docker tag $ImageFullName $RegistryImage }

    Write-Host "Tagged: $RegistryImage" -ForegroundColor Green
}

Task Inspect -depends Build {
    Write-Host "Inspecting Docker image..." -ForegroundColor Green

    $imageInfo = docker inspect $ImageFullName | ConvertFrom-Json

    Write-Host "  Image ID: $($imageInfo[0].Id)" -ForegroundColor Gray
    Write-Host "  Created: $($imageInfo[0].Created)" -ForegroundColor Gray
    Write-Host "  Size: $([math]::Round($imageInfo[0].Size / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "  Architecture: $($imageInfo[0].Architecture)" -ForegroundColor Gray

    # List image layers
    Write-Host "  Layers: $($imageInfo[0].RootFS.Layers.Count)" -ForegroundColor Gray
}

Task Scan -depends Build {
    Write-Host "Scanning image for vulnerabilities..." -ForegroundColor Green

    # Check if docker scan is available (requires Docker Desktop)
    try {
        exec { docker scan $ImageFullName }
    }
    catch {
        Write-Warning "Docker scan not available. Consider using Trivy or Snyk for vulnerability scanning."
    }
}

Task Run -depends Build, Clean {
    Write-Host "Running Docker container: $ContainerName" -ForegroundColor Green

    exec {
        docker run -d `
            --name $ContainerName `
            -p "${HostPort}:${ContainerPort}" `
            $ImageFullName
    }

    Write-Host "Container started: $ContainerName" -ForegroundColor Green
    Write-Host "Access application at: http://localhost:${HostPort}" -ForegroundColor Yellow
}

Task RunInteractive -depends Build {
    Write-Host "Running Docker container interactively..." -ForegroundColor Green

    exec { docker run -it --rm -p "${HostPort}:${ContainerPort}" $ImageFullName }
}

Task Exec {
    Write-Host "Executing shell in running container..." -ForegroundColor Green

    $container = docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
    if ($container -ne $ContainerName) {
        throw "Container $ContainerName is not running. Start it first with 'Run' task."
    }

    exec { docker exec -it $ContainerName /bin/sh }
}

Task Logs {
    Write-Host "Viewing container logs..." -ForegroundColor Green

    $container = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
    if ($container -ne $ContainerName) {
        throw "Container $ContainerName not found"
    }

    exec { docker logs -f $ContainerName }
}

Task Stop {
    Write-Host "Stopping container: $ContainerName" -ForegroundColor Green

    $container = docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
    if ($container -eq $ContainerName) {
        exec { docker stop $ContainerName }
        Write-Host "Container stopped: $ContainerName" -ForegroundColor Green
    }
    else {
        Write-Warning "Container $ContainerName is not running"
    }
}

Task Remove -depends Stop {
    Write-Host "Removing container: $ContainerName" -ForegroundColor Green

    $container = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
    if ($container -eq $ContainerName) {
        exec { docker rm $ContainerName }
        Write-Host "Container removed: $ContainerName" -ForegroundColor Green
    }
}

Task Login {
    Write-Host "Logging in to Docker registry..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($RegistryUsername)) {
        throw "DOCKER_USERNAME environment variable is required"
    }

    if ([string]::IsNullOrEmpty($RegistryToken)) {
        throw "DOCKER_TOKEN environment variable is required"
    }

    # Use token authentication (recommended for CI/CD)
    $env:DOCKER_TOKEN | docker login $Registry --username $RegistryUsername --password-stdin

    Write-Host "Successfully logged in to $Registry" -ForegroundColor Green
}

Task Push -depends Tag, Login {
    Write-Host "Pushing image to registry..." -ForegroundColor Green

    exec { docker push $RegistryImage }

    Write-Host "Successfully pushed: $RegistryImage" -ForegroundColor Green
}

Task Pull {
    Write-Host "Pulling image from registry..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($RegistryUsername)) {
        throw "DOCKER_USERNAME environment variable is required"
    }

    exec { docker pull $RegistryImage }

    Write-Host "Successfully pulled: $RegistryImage" -ForegroundColor Green
}

Task Prune {
    Write-Host "Pruning unused Docker resources..." -ForegroundColor Green

    $confirmation = Read-Host "This will remove all unused images, containers, and networks. Continue? (yes/no)"
    if ($confirmation -eq 'yes') {
        exec { docker system prune -a -f --volumes }
        Write-Host "Docker system pruned" -ForegroundColor Green
    }
    else {
        Write-Host "Prune cancelled" -ForegroundColor Yellow
    }
}
```

## Multi-Stage Builds

Multi-stage builds create smaller, more secure production images:

```powershell
Properties {
    $ImageName = 'myapp'
    $ImageTag = 'latest'
    $BuildStage = 'production'  # Options: development, production
}

Task BuildDevelopment {
    Write-Host "Building development image..." -ForegroundColor Green

    exec {
        docker build `
            --target development `
            -t "${ImageName}:dev" `
            .
    }
}

Task BuildProduction {
    Write-Host "Building production image..." -ForegroundColor Green

    exec {
        docker build `
            --target production `
            -t "${ImageName}:${ImageTag}" `
            .
    }
}

Task BuildAll {
    Write-Host "Building all stages..." -ForegroundColor Green

    # Build development stage
    Invoke-psake -taskList BuildDevelopment

    # Build production stage
    Invoke-psake -taskList BuildProduction
}
```

Example multi-stage `Dockerfile`:

```dockerfile
# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Run tests and build
RUN npm run test
RUN npm run build

# Stage 2: Development stage (includes dev tools)
FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# Stage 3: Production stage (optimized)
FROM node:18-alpine AS production

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

For .NET applications:

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY ["MyApp/MyApp.csproj", "MyApp/"]
RUN dotnet restore "MyApp/MyApp.csproj"

COPY . .
WORKDIR "/src/MyApp"
RUN dotnet build "MyApp.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "MyApp.csproj" -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

COPY --from=publish /app/publish .

EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "MyApp.dll"]
```

## Pushing to Container Registries

### Docker Hub

```powershell
Properties {
    $DockerHubUsername = $env:DOCKER_USERNAME
    $DockerHubToken = $env:DOCKER_TOKEN
    $Repository = 'myapp'
    $Tag = 'latest'
}

Task PushDockerHub -depends Build {
    Write-Host "Pushing to Docker Hub..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($DockerHubUsername) -or [string]::IsNullOrEmpty($DockerHubToken)) {
        throw "DOCKER_USERNAME and DOCKER_TOKEN environment variables are required"
    }

    # Login
    $env:DOCKER_TOKEN | docker login --username $DockerHubUsername --password-stdin

    # Tag image
    $fullImage = "${DockerHubUsername}/${Repository}:${Tag}"
    exec { docker tag "${Repository}:${Tag}" $fullImage }

    # Push
    exec { docker push $fullImage }

    Write-Host "Successfully pushed to Docker Hub: $fullImage" -ForegroundColor Green
}
```

### AWS Elastic Container Registry (ECR)

```powershell
Properties {
    $AwsRegion = if ($env:AWS_REGION) { $env:AWS_REGION } else { 'us-east-1' }
    $AwsAccountId = $env:AWS_ACCOUNT_ID
    $EcrRepository = 'myapp'
    $ImageTag = 'latest'
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

Task EcrLogin -depends VerifyAwsCli {
    Write-Host "Logging in to AWS ECR..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($AwsAccountId)) {
        throw "AWS_ACCOUNT_ID environment variable is required"
    }

    # Get ECR login password and login to Docker
    $loginCmd = "aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin ${AwsAccountId}.dkr.ecr.${AwsRegion}.amazonaws.com"

    exec { Invoke-Expression $loginCmd }

    Write-Host "Successfully logged in to ECR" -ForegroundColor Green
}

Task EcrPush -depends Build, EcrLogin {
    Write-Host "Pushing to AWS ECR..." -ForegroundColor Green

    $ecrImage = "${AwsAccountId}.dkr.ecr.${AwsRegion}.amazonaws.com/${EcrRepository}:${ImageTag}"

    # Tag image
    exec { docker tag "${EcrRepository}:${ImageTag}" $ecrImage }

    # Push image
    exec { docker push $ecrImage }

    Write-Host "Successfully pushed to ECR: $ecrImage" -ForegroundColor Green
}

Task EcrCreateRepo -depends VerifyAwsCli {
    Write-Host "Creating ECR repository..." -ForegroundColor Green

    try {
        exec {
            aws ecr create-repository `
                --repository-name $EcrRepository `
                --region $AwsRegion `
                --image-scanning-configuration scanOnPush=true
        }
        Write-Host "Repository created: $EcrRepository" -ForegroundColor Green
    }
    catch {
        Write-Warning "Repository may already exist or creation failed"
    }
}
```

### Azure Container Registry (ACR)

```powershell
Properties {
    $AcrName = $env:ACR_NAME  # e.g., 'myregistry'
    $AcrResourceGroup = $env:ACR_RESOURCE_GROUP
    $Repository = 'myapp'
    $ImageTag = 'latest'
}

Task VerifyAzCli {
    try {
        $azVersion = az --version | Select-Object -First 1
        Write-Host "Azure CLI: $azVersion" -ForegroundColor Gray
    }
    catch {
        throw "Azure CLI is not installed. Install from https://docs.microsoft.com/cli/azure/"
    }
}

Task AcrLogin -depends VerifyAzCli {
    Write-Host "Logging in to Azure Container Registry..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($AcrName)) {
        throw "ACR_NAME environment variable is required"
    }

    exec { az acr login --name $AcrName }

    Write-Host "Successfully logged in to ACR: $AcrName" -ForegroundColor Green
}

Task AcrPush -depends Build, AcrLogin {
    Write-Host "Pushing to Azure Container Registry..." -ForegroundColor Green

    $acrImage = "${AcrName}.azurecr.io/${Repository}:${ImageTag}"

    # Tag image
    exec { docker tag "${Repository}:${ImageTag}" $acrImage }

    # Push image
    exec { docker push $acrImage }

    Write-Host "Successfully pushed to ACR: $acrImage" -ForegroundColor Green
}

Task AcrCreateRepo -depends VerifyAzCli {
    Write-Host "Creating ACR..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($AcrResourceGroup)) {
        throw "ACR_RESOURCE_GROUP environment variable is required"
    }

    try {
        exec {
            az acr create `
                --resource-group $AcrResourceGroup `
                --name $AcrName `
                --sku Basic
        }
        Write-Host "ACR created: $AcrName" -ForegroundColor Green
    }
    catch {
        Write-Warning "ACR may already exist or creation failed"
    }
}
```

### Google Container Registry (GCR)

```powershell
Properties {
    $GcpProject = $env:GCP_PROJECT_ID
    $GcrHostname = 'gcr.io'  # Options: gcr.io, us.gcr.io, eu.gcr.io, asia.gcr.io
    $Repository = 'myapp'
    $ImageTag = 'latest'
}

Task VerifyGcloud {
    try {
        $gcloudVersion = gcloud --version | Select-Object -First 1
        Write-Host "Google Cloud SDK: $gcloudVersion" -ForegroundColor Gray
    }
    catch {
        throw "Google Cloud SDK is not installed. Install from https://cloud.google.com/sdk/"
    }
}

Task GcrLogin -depends VerifyGcloud {
    Write-Host "Configuring Docker for GCR..." -ForegroundColor Green

    exec { gcloud auth configure-docker $GcrHostname }

    Write-Host "Successfully configured Docker for GCR" -ForegroundColor Green
}

Task GcrPush -depends Build, GcrLogin {
    Write-Host "Pushing to Google Container Registry..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($GcpProject)) {
        throw "GCP_PROJECT_ID environment variable is required"
    }

    $gcrImage = "${GcrHostname}/${GcpProject}/${Repository}:${ImageTag}"

    # Tag image
    exec { docker tag "${Repository}:${ImageTag}" $gcrImage }

    # Push image
    exec { docker push $gcrImage }

    Write-Host "Successfully pushed to GCR: $gcrImage" -ForegroundColor Green
}
```

## Docker Compose Integration

For multi-container applications, integrate Docker Compose:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $ComposeFile = Join-Path $ProjectRoot 'docker-compose.yml'
    $ComposeProjectName = 'myapp'
    $Environment = 'development'
}

Task VerifyCompose {
    Write-Host "Verifying Docker Compose installation..." -ForegroundColor Green

    try {
        $composeVersion = docker compose version
        Write-Host "  Docker Compose: $composeVersion" -ForegroundColor Gray
    }
    catch {
        throw "Docker Compose is not available. Install Docker Desktop or Docker Compose plugin."
    }

    if (-not (Test-Path $ComposeFile)) {
        throw "docker-compose.yml not found at: $ComposeFile"
    }
}

Task ComposeUp -depends VerifyCompose {
    Write-Host "Starting Docker Compose services..." -ForegroundColor Green

    $env:COMPOSE_PROJECT_NAME = $ComposeProjectName
    $env:ENVIRONMENT = $Environment

    exec { docker compose -f $ComposeFile up -d }

    Write-Host "Services started. Use 'docker compose ps' to view status." -ForegroundColor Green
}

Task ComposeBuild -depends VerifyCompose {
    Write-Host "Building Docker Compose services..." -ForegroundColor Green

    $env:COMPOSE_PROJECT_NAME = $ComposeProjectName

    exec { docker compose -f $ComposeFile build --no-cache }

    Write-Host "Services built successfully" -ForegroundColor Green
}

Task ComposeDown {
    Write-Host "Stopping Docker Compose services..." -ForegroundColor Green

    $env:COMPOSE_PROJECT_NAME = $ComposeProjectName

    exec { docker compose -f $ComposeFile down }

    Write-Host "Services stopped" -ForegroundColor Green
}

Task ComposeDownVolumes {
    Write-Host "Stopping services and removing volumes..." -ForegroundColor Green

    $env:COMPOSE_PROJECT_NAME = $ComposeProjectName

    exec { docker compose -f $ComposeFile down -v }

    Write-Host "Services stopped and volumes removed" -ForegroundColor Green
}

Task ComposeLogs {
    Write-Host "Viewing Docker Compose logs..." -ForegroundColor Green

    $env:COMPOSE_PROJECT_NAME = $ComposeProjectName

    exec { docker compose -f $ComposeFile logs -f }
}

Task ComposePs {
    Write-Host "Listing Docker Compose services..." -ForegroundColor Green

    $env:COMPOSE_PROJECT_NAME = $ComposeProjectName

    exec { docker compose -f $ComposeFile ps }
}

Task ComposeRestart {
    Write-Host "Restarting Docker Compose services..." -ForegroundColor Green

    $env:COMPOSE_PROJECT_NAME = $ComposeProjectName

    exec { docker compose -f $ComposeFile restart }

    Write-Host "Services restarted" -ForegroundColor Green
}
```

Example `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: ${ENVIRONMENT:-production}
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=${ENVIRONMENT:-production}
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app-network
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - app-network
    ports:
      - "6379:6379"

volumes:
  db-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

## Cross-Platform Builds

Build images for multiple architectures:

```powershell
Properties {
    $ImageName = 'myapp'
    $ImageTag = 'latest'
    $Registry = 'docker.io'
    $Username = $env:DOCKER_USERNAME
    $Platforms = 'linux/amd64,linux/arm64,linux/arm/v7'
    $BuilderName = 'multiplatform-builder'
}

Task CreateBuilder {
    Write-Host "Creating buildx builder..." -ForegroundColor Green

    # Check if builder exists
    $existingBuilder = docker buildx ls | Select-String $BuilderName

    if (-not $existingBuilder) {
        exec { docker buildx create --name $BuilderName --use }
        Write-Host "Builder created: $BuilderName" -ForegroundColor Green
    }
    else {
        exec { docker buildx use $BuilderName }
        Write-Host "Using existing builder: $BuilderName" -ForegroundColor Gray
    }

    # Bootstrap builder
    exec { docker buildx inspect --bootstrap }
}

Task BuildMultiPlatform -depends CreateBuilder {
    Write-Host "Building multi-platform image..." -ForegroundColor Green

    $fullImage = "${Registry}/${Username}/${ImageName}:${ImageTag}"

    exec {
        docker buildx build `
            --platform $Platforms `
            --tag $fullImage `
            --push `
            .
    }

    Write-Host "Multi-platform image built and pushed: $fullImage" -ForegroundColor Green
}

Task RemoveBuilder {
    Write-Host "Removing buildx builder..." -ForegroundColor Green

    exec { docker buildx rm $BuilderName } -errorMessage "Builder not found"
}
```

## Best Practices

### 1. Use .dockerignore

Create a `.dockerignore` file to exclude unnecessary files:

```
node_modules
npm-debug.log
dist
build
.git
.gitignore
.env
.env.local
*.md
coverage
.vscode
.idea
```

### 2. Optimize Layer Caching

```dockerfile
# Good: Copy dependency files first (cached unless they change)
COPY package*.json ./
RUN npm ci

# Then copy source code (changes frequently)
COPY . .
```

### 3. Use Specific Base Image Tags

```dockerfile
# Bad: Latest can change unexpectedly
FROM node:latest

# Good: Pin specific version
FROM node:18.17.1-alpine

# Better: Use digest for immutability
FROM node:18.17.1-alpine@sha256:abc123...
```

### 4. Run as Non-Root User

```dockerfile
# Create and use non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs
```

### 5. Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

### 6. Small Image Sizes

```powershell
Task AnalyzeSize -depends Build {
    Write-Host "Analyzing image sizes..." -ForegroundColor Green

    $images = docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | Where-Object { $_ -like "*${ImageName}*" }

    foreach ($image in $images) {
        Write-Host "  $image" -ForegroundColor Gray
    }

    # Use dive tool for detailed analysis
    if (Get-Command dive -ErrorAction SilentlyContinue) {
        exec { dive $ImageFullName }
    }
    else {
        Write-Warning "Install 'dive' tool for detailed layer analysis: https://github.com/wagoodman/dive"
    }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Docker Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Scope CurrentUser -Force

      - name: Build and push with psake
        shell: pwsh
        run: |
          Invoke-psake -buildFile .\psakefile.ps1 -taskList Push
        env:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}
```

## Troubleshooting

### Docker Daemon Not Running

**Problem:** `Cannot connect to the Docker daemon`

**Solution:**

```powershell
Task VerifyDocker {
    try {
        exec { docker info } | Out-Null
        Write-Host "Docker daemon is running" -ForegroundColor Green
    }
    catch {
        throw "Docker daemon is not running. Start Docker Desktop or Docker service."
    }
}
```

### Build Cache Issues

**Problem:** Changes not reflected in build

**Solution:** Force rebuild without cache:

```powershell
Task RebuildNoCache {
    exec { docker build --no-cache -t $ImageFullName . }
}
```

### Permission Denied in Container

**Problem:** EACCES or permission denied errors

**Solution:** Fix file ownership:

```dockerfile
# Change ownership to app user
COPY --chown=nodejs:nodejs . .

# Or use chmod
RUN chmod -R 755 /app
```

### Large Image Sizes

**Problem:** Images are too large

**Solution:** Use Alpine base images and multi-stage builds:

```dockerfile
# Use Alpine variants
FROM node:18-alpine AS base

# Use multi-stage builds
FROM build AS production
COPY --from=build /app/dist ./dist

# Remove unnecessary files
RUN rm -rf /tmp/* /var/cache/apk/*
```

### Port Already in Use

**Problem:** Container fails to start due to port conflict

**Solution:**

```powershell
Task CheckPort {
    param([int]$Port = 8080)

    $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

    if ($listener) {
        Write-Warning "Port $Port is already in use by process $($listener.OwningProcess)"
        throw "Port conflict on $Port"
    }
}

Task Run -depends CheckPort, Build {
    exec { docker run -p "${HostPort}:${ContainerPort}" $ImageFullName }
}
```

### Registry Authentication Failures

**Problem:** Push fails with authentication error

**Solution:** Use token authentication:

```powershell
Task SecureLogin {
    # Use token from environment variable
    if ([string]::IsNullOrEmpty($env:DOCKER_TOKEN)) {
        throw "DOCKER_TOKEN environment variable is required"
    }

    # Use stdin to avoid exposing token in command
    $env:DOCKER_TOKEN | docker login --username $env:DOCKER_USERNAME --password-stdin
}
```

## See Also

- [Installing psake](/docs/tutorial-basics/installing) - Installation guide
- [GitHub Actions Integration](/docs/ci-examples/github-actions) - CI/CD automation with Docker
- [Node.js Builds](/docs/build-types/nodejs) - Node.js build examples
- [.NET Solution Builds](/docs/build-types/dot-net-solution) - .NET build examples
- [Error Handling](/docs/tutorial-advanced/logging-errors) - Build error management
