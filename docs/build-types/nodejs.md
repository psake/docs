---
title: "Node.js and npm Projects"
description: "Build, test, and deploy Node.js applications using psake with npm, TypeScript, Webpack, and npm registry publishing"
---

# Node.js and npm Projects

psake can orchestrate Node.js and npm-based builds, providing a consistent PowerShell-based build automation layer across your development workflow. This guide shows you how to build, test, bundle, and publish Node.js projects using psake.

## Quick Start

Here's a basic psake build script for a Node.js project:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $NodeModules = Join-Path $ProjectRoot 'node_modules'
    $BuildDir = Join-Path $ProjectRoot 'build'
    $DistDir = Join-Path $ProjectRoot 'dist'
}

Task Default -depends Test

Task Clean {
    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
    if (Test-Path $DistDir) {
        Remove-Item $DistDir -Recurse -Force
    }
}

Task Install {
    exec { npm install }
}

Task Build -depends Install, Clean {
    exec { npm run build }
}

Task Test -depends Build {
    exec { npm test }
}
```

Run the build:

```powershell
Invoke-psake -buildFile .\psakefile.ps1
```

## Complete Node.js Build Example

Here's a comprehensive psakefile.ps1 for a production Node.js application:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $SrcDir = Join-Path $ProjectRoot 'src'
    $TestDir = Join-Path $ProjectRoot 'tests'
    $BuildDir = Join-Path $ProjectRoot 'build'
    $DistDir = Join-Path $ProjectRoot 'dist'
    $CoverageDir = Join-Path $ProjectRoot 'coverage'
    $NodeModules = Join-Path $ProjectRoot 'node_modules'

    $Environment = 'development'
    $Version = '1.0.0'
    $Verbose = $false
}

FormatTaskName {
    param($taskName)
    Write-Host "Executing task: $taskName" -ForegroundColor Cyan
}

Task Default -depends Test

Task Clean {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Green

    @($BuildDir, $DistDir, $CoverageDir) | ForEach-Object {
        if (Test-Path $_) {
            Remove-Item $_ -Recurse -Force
            Write-Host "  Removed: $_" -ForegroundColor Gray
        }
    }

    New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
}

Task Install {
    Write-Host "Installing npm dependencies..." -ForegroundColor Green

    if (-not (Test-Path $NodeModules)) {
        exec { npm install }
    } else {
        exec { npm ci }
    }
}

Task Lint -depends Install {
    Write-Host "Running ESLint..." -ForegroundColor Green
    exec { npm run lint }
}

Task Build -depends Install, Clean {
    Write-Host "Building application..." -ForegroundColor Green

    $env:NODE_ENV = $Environment

    if ($Verbose) {
        exec { npm run build -- --verbose }
    } else {
        exec { npm run build }
    }

    Write-Host "Build complete: $BuildDir" -ForegroundColor Green
}

Task Test -depends Build {
    Write-Host "Running tests..." -ForegroundColor Green
    exec { npm test }
}

Task TestWatch {
    Write-Host "Running tests in watch mode..." -ForegroundColor Green
    exec { npm run test:watch }
}

Task Coverage -depends Install {
    Write-Host "Running tests with coverage..." -ForegroundColor Green
    exec { npm run test:coverage }

    if (Test-Path (Join-Path $CoverageDir 'lcov-report/index.html')) {
        Write-Host "Coverage report: $CoverageDir/lcov-report/index.html" -ForegroundColor Yellow
    }
}

Task Bundle -depends Test {
    Write-Host "Creating production bundle..." -ForegroundColor Green

    $env:NODE_ENV = 'production'
    exec { npm run bundle }

    Write-Host "Bundle complete: $DistDir" -ForegroundColor Green
}

Task Package -depends Bundle {
    Write-Host "Creating package..." -ForegroundColor Green

    exec { npm pack --pack-destination $DistDir }

    $packageFile = Get-ChildItem "$DistDir/*.tgz" | Select-Object -First 1
    Write-Host "Package created: $($packageFile.Name)" -ForegroundColor Green
}

Task Verify {
    Write-Host "Verifying package.json..." -ForegroundColor Green

    if (-not (Test-Path 'package.json')) {
        throw "package.json not found"
    }

    $packageJson = Get-Content 'package.json' | ConvertFrom-Json

    if ([string]::IsNullOrEmpty($packageJson.name)) {
        throw "Package name is required in package.json"
    }

    if ([string]::IsNullOrEmpty($packageJson.version)) {
        throw "Package version is required in package.json"
    }

    Write-Host "  Package: $($packageJson.name)@$($packageJson.version)" -ForegroundColor Gray
}

Task Publish -depends Test, Verify, Package {
    Write-Host "Publishing to npm registry..." -ForegroundColor Green

    $npmToken = $env:NPM_TOKEN
    if ([string]::IsNullOrEmpty($npmToken)) {
        throw "NPM_TOKEN environment variable is required for publishing"
    }

    # Configure npm authentication
    exec { npm config set //registry.npmjs.org/:_authToken $npmToken }

    try {
        exec { npm publish --access public }
        Write-Host "Successfully published to npm registry" -ForegroundColor Green
    }
    finally {
        # Clean up authentication
        exec { npm config delete //registry.npmjs.org/:_authToken }
    }
}

Task Dev {
    Write-Host "Starting development server..." -ForegroundColor Green
    exec { npm run dev }
}

Task Serve -depends Build {
    Write-Host "Starting production server..." -ForegroundColor Green

    $env:NODE_ENV = 'production'
    exec { npm start }
}

Task Audit {
    Write-Host "Running security audit..." -ForegroundColor Green
    exec { npm audit }
}

Task AuditFix {
    Write-Host "Fixing security vulnerabilities..." -ForegroundColor Green
    exec { npm audit fix }
}

Task Outdated {
    Write-Host "Checking for outdated packages..." -ForegroundColor Green
    exec { npm outdated } -errorMessage "Some packages are outdated (this is informational)"
}

Task UpdateDeps {
    Write-Host "Updating dependencies..." -ForegroundColor Green
    exec { npm update }
    exec { npm outdated } -errorMessage "Dependencies updated"
}
```

## TypeScript Compilation

For TypeScript projects, add TypeScript-specific tasks:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $SrcDir = Join-Path $ProjectRoot 'src'
    $OutDir = Join-Path $ProjectRoot 'dist'
    $TsConfig = Join-Path $ProjectRoot 'tsconfig.json'
}

Task TypeCheck -depends Install {
    Write-Host "Running TypeScript type checking..." -ForegroundColor Green

    if (-not (Test-Path $TsConfig)) {
        throw "tsconfig.json not found"
    }

    exec { npx tsc --noEmit }
    Write-Host "Type checking passed" -ForegroundColor Green
}

Task CompileTS -depends Install, Clean {
    Write-Host "Compiling TypeScript..." -ForegroundColor Green

    exec { npx tsc --project $TsConfig }

    Write-Host "TypeScript compilation complete: $OutDir" -ForegroundColor Green
}

Task CompileTSWatch {
    Write-Host "Compiling TypeScript in watch mode..." -ForegroundColor Green
    exec { npx tsc --watch --project $TsConfig }
}

Task Build -depends TypeCheck, CompileTS {
    Write-Host "Build complete" -ForegroundColor Green
}
```

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Webpack Bundling

For projects using Webpack, integrate bundling tasks:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $SrcDir = Join-Path $ProjectRoot 'src'
    $DistDir = Join-Path $ProjectRoot 'dist'
    $WebpackConfig = Join-Path $ProjectRoot 'webpack.config.js'
    $Environment = 'development'
}

Task WebpackBuild -depends Install {
    Write-Host "Running Webpack build ($Environment)..." -ForegroundColor Green

    if (-not (Test-Path $WebpackConfig)) {
        throw "webpack.config.js not found"
    }

    $env:NODE_ENV = $Environment

    if ($Environment -eq 'production') {
        exec { npx webpack --config $WebpackConfig --mode production }
    } else {
        exec { npx webpack --config $WebpackConfig --mode development }
    }

    Write-Host "Webpack bundle complete: $DistDir" -ForegroundColor Green
}

Task WebpackWatch -depends Install {
    Write-Host "Running Webpack in watch mode..." -ForegroundColor Green
    exec { npx webpack --config $WebpackConfig --mode development --watch }
}

Task WebpackAnalyze -depends Install {
    Write-Host "Analyzing Webpack bundle..." -ForegroundColor Green

    $env:ANALYZE = 'true'
    exec { npx webpack --config $WebpackConfig --mode production }
}

Task OptimizeBundle -depends WebpackBuild {
    Write-Host "Optimizing bundle size..." -ForegroundColor Green

    # Run bundle size analysis
    exec { npx bundlesize }

    # Check bundle sizes
    $jsFiles = Get-ChildItem "$DistDir/*.js" -File
    foreach ($file in $jsFiles) {
        $sizeKB = [math]::Round($file.Length / 1KB, 2)
        Write-Host "  $($file.Name): ${sizeKB} KB" -ForegroundColor Gray

        if ($sizeKB -gt 500) {
            Write-Warning "Bundle size exceeds 500 KB: $($file.Name)"
        }
    }
}
```

Example `webpack.config.js`:

```javascript
const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin()] : []),
  ],
};
```

## Testing with Jest

Integrate Jest testing into your psake build:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $TestDir = Join-Path $ProjectRoot 'tests'
    $CoverageDir = Join-Path $ProjectRoot 'coverage'
    $CoverageThreshold = 80
}

Task Test -depends Install {
    Write-Host "Running Jest tests..." -ForegroundColor Green
    exec { npx jest --coverage=false }
}

Task TestWatch -depends Install {
    Write-Host "Running Jest in watch mode..." -ForegroundColor Green
    exec { npx jest --watch }
}

Task TestCoverage -depends Install {
    Write-Host "Running tests with coverage..." -ForegroundColor Green
    exec { npx jest --coverage --coverageReporters=text --coverageReporters=html }

    # Parse coverage summary
    $coverageSummary = Join-Path $CoverageDir 'coverage-summary.json'
    if (Test-Path $coverageSummary) {
        $coverage = Get-Content $coverageSummary | ConvertFrom-Json
        $totalCoverage = $coverage.total.lines.pct

        Write-Host "Total line coverage: ${totalCoverage}%" -ForegroundColor Cyan

        if ($totalCoverage -lt $CoverageThreshold) {
            throw "Coverage ${totalCoverage}% is below threshold ${CoverageThreshold}%"
        }
    }
}

Task TestCI -depends Install {
    Write-Host "Running tests for CI..." -ForegroundColor Green

    # Use CI-friendly options
    exec { npx jest --ci --coverage --maxWorkers=2 }
}
```

Example `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Linting with ESLint

Add linting tasks to maintain code quality:

```powershell
Task Lint -depends Install {
    Write-Host "Running ESLint..." -ForegroundColor Green
    exec { npx eslint src --ext .js,.ts,.tsx }
}

Task LintFix -depends Install {
    Write-Host "Running ESLint with auto-fix..." -ForegroundColor Green
    exec { npx eslint src --ext .js,.ts,.tsx --fix }
}

Task Format -depends Install {
    Write-Host "Formatting code with Prettier..." -ForegroundColor Green
    exec { npx prettier --write "src/**/*.{js,ts,tsx,json,css,md}" }
}

Task FormatCheck -depends Install {
    Write-Host "Checking code formatting..." -ForegroundColor Green
    exec { npx prettier --check "src/**/*.{js,ts,tsx,json,css,md}" }
}
```

## Publishing to npm Registry

Here's a complete workflow for publishing packages to npm:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $DistDir = Join-Path $ProjectRoot 'dist'
    $Registry = 'https://registry.npmjs.org/'
    $NpmToken = $env:NPM_TOKEN
    $DryRun = $false
}

Task ValidatePackage {
    Write-Host "Validating package..." -ForegroundColor Green

    # Check package.json
    if (-not (Test-Path 'package.json')) {
        throw "package.json not found"
    }

    $pkg = Get-Content 'package.json' | ConvertFrom-Json

    # Validate required fields
    $requiredFields = @('name', 'version', 'description', 'main', 'license')
    foreach ($field in $requiredFields) {
        if ([string]::IsNullOrEmpty($pkg.$field)) {
            throw "package.json is missing required field: $field"
        }
    }

    # Check if version already exists
    $packageName = $pkg.name
    $version = $pkg.version

    Write-Host "  Package: $packageName" -ForegroundColor Gray
    Write-Host "  Version: $version" -ForegroundColor Gray
    Write-Host "  License: $($pkg.license)" -ForegroundColor Gray

    try {
        $existingVersions = npm view $packageName versions --json | ConvertFrom-Json
        if ($existingVersions -contains $version) {
            throw "Version $version already exists in registry"
        }
    }
    catch {
        Write-Host "  Package not yet published (this is OK for first release)" -ForegroundColor Yellow
    }
}

Task PrepareRelease -depends Test, ValidatePackage {
    Write-Host "Preparing release..." -ForegroundColor Green

    # Clean and build
    exec { Invoke-psake -taskList Clean, Build }

    # Verify dist directory exists
    if (-not (Test-Path $DistDir)) {
        throw "Distribution directory not found: $DistDir"
    }

    # Check for required files
    $requiredFiles = @('package.json', 'README.md')
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            throw "Required file not found: $file"
        }
    }
}

Task PublishPackage -depends PrepareRelease {
    Write-Host "Publishing package to npm..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($NpmToken)) {
        throw "NPM_TOKEN environment variable is required"
    }

    # Configure authentication
    $npmrcPath = Join-Path $ProjectRoot '.npmrc'
    try {
        # Create temporary .npmrc
        @"
//registry.npmjs.org/:_authToken=$NpmToken
registry=$Registry
"@ | Set-Content $npmrcPath

        if ($DryRun) {
            Write-Host "DRY RUN: Would publish package" -ForegroundColor Yellow
            exec { npm publish --dry-run --access public }
        }
        else {
            exec { npm publish --access public }

            $pkg = Get-Content 'package.json' | ConvertFrom-Json
            Write-Host "Successfully published $($pkg.name)@$($pkg.version)" -ForegroundColor Green
        }
    }
    finally {
        # Clean up .npmrc
        if (Test-Path $npmrcPath) {
            Remove-Item $npmrcPath -Force
        }
    }
}

Task PublishBeta -depends Test, ValidatePackage {
    Write-Host "Publishing beta version to npm..." -ForegroundColor Green

    if ([string]::IsNullOrEmpty($NpmToken)) {
        throw "NPM_TOKEN environment variable is required"
    }

    # Configure authentication
    exec { npm config set //registry.npmjs.org/:_authToken $NpmToken }

    try {
        exec { npm publish --tag beta --access public }
        Write-Host "Successfully published beta version" -ForegroundColor Green
    }
    finally {
        exec { npm config delete //registry.npmjs.org/:_authToken }
    }
}

Task UnpublishPackage {
    Write-Host "WARNING: Unpublishing package..." -ForegroundColor Red

    $pkg = Get-Content 'package.json' | ConvertFrom-Json
    $packageName = $pkg.name
    $version = $pkg.version

    $confirmation = Read-Host "Are you sure you want to unpublish ${packageName}@${version}? (yes/no)"
    if ($confirmation -ne 'yes') {
        Write-Host "Unpublish cancelled" -ForegroundColor Yellow
        return
    }

    if ([string]::IsNullOrEmpty($NpmToken)) {
        throw "NPM_TOKEN environment variable is required"
    }

    exec { npm config set //registry.npmjs.org/:_authToken $NpmToken }

    try {
        exec { npm unpublish "${packageName}@${version}" }
        Write-Host "Successfully unpublished ${packageName}@${version}" -ForegroundColor Green
    }
    finally {
        exec { npm config delete //registry.npmjs.org/:_authToken }
    }
}
```

## Monorepo Support (npm Workspaces)

For monorepo projects using npm workspaces:

```powershell
Properties {
    $ProjectRoot = $PSScriptRoot
    $Workspaces = @('packages/core', 'packages/cli', 'packages/utils')
}

Task InstallAll {
    Write-Host "Installing all workspace dependencies..." -ForegroundColor Green
    exec { npm install }
}

Task BuildAll {
    Write-Host "Building all workspaces..." -ForegroundColor Green

    foreach ($workspace in $Workspaces) {
        Write-Host "  Building $workspace..." -ForegroundColor Cyan
        exec { npm run build --workspace=$workspace }
    }
}

Task TestAll {
    Write-Host "Testing all workspaces..." -ForegroundColor Green
    exec { npm test --workspaces }
}

Task BuildWorkspace {
    param([string]$Name)

    if ([string]::IsNullOrEmpty($Name)) {
        throw "Workspace name is required. Usage: Invoke-psake BuildWorkspace -parameters @{Name='packages/core'}"
    }

    Write-Host "Building workspace: $Name" -ForegroundColor Green
    exec { npm run build --workspace=$Name }
}

Task PublishWorkspace {
    param([string]$Name)

    if ([string]::IsNullOrEmpty($Name)) {
        throw "Workspace name is required"
    }

    Write-Host "Publishing workspace: $Name" -ForegroundColor Green
    exec { npm publish --workspace=$Name --access public }
}
```

## Docker Integration

Combine psake with Docker for containerized Node.js builds:

```powershell
Properties {
    $ImageName = 'myapp'
    $ImageTag = 'latest'
    $DockerRegistry = 'docker.io'
}

Task DockerBuild -depends Test {
    Write-Host "Building Docker image..." -ForegroundColor Green

    $fullImageName = "${DockerRegistry}/${ImageName}:${ImageTag}"
    exec { docker build -t $fullImageName . }

    Write-Host "Docker image built: $fullImageName" -ForegroundColor Green
}

Task DockerRun {
    Write-Host "Running Docker container..." -ForegroundColor Green

    $fullImageName = "${DockerRegistry}/${ImageName}:${ImageTag}"
    exec { docker run -p 3000:3000 $fullImageName }
}

Task DockerPush -depends DockerBuild {
    Write-Host "Pushing Docker image to registry..." -ForegroundColor Green

    $fullImageName = "${DockerRegistry}/${ImageName}:${ImageTag}"
    exec { docker push $fullImageName }
}
```

Example `Dockerfile` for Node.js:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## CI/CD Integration

Example integration with CI/CD platforms:

### GitHub Actions

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install psake
        shell: pwsh
        run: Install-Module -Name psake -Scope CurrentUser -Force

      - name: Run psake build
        shell: pwsh
        run: |
          Invoke-psake -buildFile .\psakefile.ps1 -taskList Test

      - name: Publish to npm
        if: github.ref == 'refs/heads/main'
        shell: pwsh
        run: |
          Invoke-psake -buildFile .\psakefile.ps1 -taskList PublishPackage
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Best Practices

### 1. Lock Dependencies

Always commit `package-lock.json` and use `npm ci` in CI/CD:

```powershell
Task Install {
    if ($env:CI -eq 'true') {
        exec { npm ci }  # Clean install from lockfile
    } else {
        exec { npm install }  # Allow updates locally
    }
}
```

### 2. Environment-Specific Builds

Use environment variables and different configurations:

```powershell
Properties {
    $Environment = if ($env:NODE_ENV) { $env:NODE_ENV } else { 'development' }
}

Task Build {
    Write-Host "Building for environment: $Environment" -ForegroundColor Green

    $env:NODE_ENV = $Environment
    exec { npm run build }
}
```

### 3. Version Bumping

Automate version bumping:

```powershell
Task BumpVersion {
    param([string]$Type = 'patch')

    Write-Host "Bumping $Type version..." -ForegroundColor Green
    exec { npm version $Type --no-git-tag-version }

    $pkg = Get-Content 'package.json' | ConvertFrom-Json
    Write-Host "New version: $($pkg.version)" -ForegroundColor Green
}
```

### 4. Clean Node Modules

Periodically clean and reinstall:

```powershell
Task CleanInstall {
    Write-Host "Cleaning node_modules..." -ForegroundColor Green

    if (Test-Path $NodeModules) {
        Remove-Item $NodeModules -Recurse -Force
    }

    if (Test-Path 'package-lock.json') {
        Remove-Item 'package-lock.json' -Force
    }

    exec { npm install }
}
```

## Troubleshooting

### npm Command Not Found

**Problem:** `exec: npm: The term 'npm' is not recognized`

**Solution:** Ensure Node.js is installed and in PATH:

```powershell
Task VerifyNode {
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "npm: $npmVersion" -ForegroundColor Green
    }
    catch {
        throw "Node.js and npm are required. Install from https://nodejs.org/"
    }
}

Task Build -depends VerifyNode {
    exec { npm run build }
}
```

### Module Not Found Errors

**Problem:** Build fails with "Cannot find module" errors

**Solution:** Ensure dependencies are installed:

```powershell
Task Build -depends Install {
    if (-not (Test-Path $NodeModules)) {
        throw "node_modules not found. Run Install task first."
    }

    exec { npm run build }
}
```

### Permission Errors on Linux/macOS

**Problem:** EACCES errors when installing global packages

**Solution:** Use `--prefix` or configure npm properly:

```powershell
Task InstallGlobal {
    $npmPrefix = if ($IsLinux -or $IsMacOS) {
        "$HOME/.npm-global"
    } else {
        "$env:APPDATA\npm"
    }

    exec { npm config set prefix $npmPrefix }
    exec { npm install -g typescript }
}
```

### Build Fails Due to Memory Issues

**Problem:** JavaScript heap out of memory

**Solution:** Increase Node.js memory limit:

```powershell
Task Build {
    $env:NODE_OPTIONS = '--max-old-space-size=4096'
    exec { npm run build }
}
```

### TypeScript Compilation Errors

**Problem:** Type errors break the build

**Solution:** Add separate type-checking task:

```powershell
Task TypeCheck {
    Write-Host "Type checking..." -ForegroundColor Green
    exec { npx tsc --noEmit }
}

Task Build -depends TypeCheck {
    exec { npx tsc }
}
```

## See Also

- [Installing psake](/docs/tutorial-basics/installing) - Installation guide
- [GitHub Actions Integration](/docs/ci-examples/github-actions) - CI/CD automation
- [Docker Builds](/docs/build-types/docker) - Docker integration
- [.NET Solution Builds](/docs/build-types/dot-net-solution) - .NET build examples
- [Error Handling](/docs/tutorial-advanced/logging-errors) - Build error management
