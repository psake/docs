---
title: "Configuration Reference"
description: "Complete reference for the $PSBPreference hashtable and task dependency variables in PowerShellBuild."
---

# Configuration Reference

PowerShellBuild exposes all of its settings through a single hashtable called `$PSBPreference`. Override values in the `properties` block of your `psakeFile.ps1`. Task dependency chains can also be customized via separate variables set outside the `properties` block.

## Setting Preferences

```powershell title="psakeFile.ps1"
properties {
    # Override any $PSBPreference keys here
    $PSBPreference.General.ModuleName              = 'MyModule'
    $PSBPreference.Build.OutDir                    = "$PSScriptRoot/build"
    $PSBPreference.Test.ScriptAnalysis.Enabled     = $true
    $PSBPreference.Test.CodeCoverage.Enabled       = $true
    $PSBPreference.Test.CodeCoverage.Threshold     = 0.80
    $PSBPreference.Publish.PSRepositoryApiKey      = $env:PSGALLERY_API_KEY
}

task default -depends Build
task Build   -FromModule PowerShellBuild -Version '0.7.1'
```

Values not overridden retain their defaults as defined in PowerShellBuild's `build.properties.ps1`.

---

## General

| Setting | Default | Description |
|---------|---------|-------------|
| `General.ProjectRoot` | (auto-detected) | Root directory of the project |
| `General.SrcRootDir` | `$ProjectRoot/src` | Directory containing module source files |
| `General.ModuleName` | (basename of `.psd1`) | Name of the module |
| `General.ModuleVersion` | (from manifest) | Module version number |
| `General.ModuleManifestPath` | (auto-detected) | Path to the `.psd1` manifest |

---

## Build

| Setting | Default | Description |
|---------|---------|-------------|
| `Build.OutDir` | `$ProjectRoot/build` | Root output directory |
| `Build.ModuleOutDir` | `$OutDir/$ModuleName` | Module-specific output subdirectory (computed) |
| `Build.CompileModule` | `$false` | If `$true`, concatenate all `.ps1` source files into a single `.psm1` |
| `Build.CompileDirectories` | `'Enum','Classes','Private','Public'` | Directories whose `.ps1` files are merged when compiling |
| `Build.CopyDirectories` | `@()` | Directories copied as-is (not compiled) to the output |
| `Build.Exclude` | `@()` | File patterns excluded from the output |

### Module Compilation

Setting `CompileModule = $true` merges all `.ps1` files from `CompileDirectories` into the root `.psm1`. This can improve module load time and is common for published modules.

```powershell
properties {
    $PSBPreference.Build.CompileModule       = $true
    $PSBPreference.Build.CompileDirectories  = @('Enum', 'Classes', 'Private', 'Public')
    $PSBPreference.Build.CopyDirectories     = @('data', 'lib')
}
```

---

## Test

| Setting | Default | Description |
|---------|---------|-------------|
| `Test.Enabled` | `$true` | Enable or disable Pester tests |
| `Test.RootDir` | `$ProjectRoot/tests` | Directory containing Pester test files |
| `Test.OutputFile` | `$null` | Path to write NUnitXml test results (useful for CI) |
| `Test.OutputFormat` | `'NUnitXml'` | Test result format |
| `Test.ImportModule` | `$false` | Import the built module before running tests |
| `Test.OutputVerbosity` | `'Detailed'` | Pester output verbosity level |
| `Test.SkipRemainingOnFailure` | `'None'` | Skip strategy after a test failure |

### Script Analysis

| Setting | Default | Description |
|---------|---------|-------------|
| `Test.ScriptAnalysis.Enabled` | `$true` | Run PSScriptAnalyzer |
| `Test.ScriptAnalysis.FailBuildOnSeverityLevel` | `'Error'` | Build fails on violations at or above this severity (`'Error'`, `'Warning'`, `'Information'`) |
| `Test.ScriptAnalysis.SettingsPath` | `$null` | Path to a PSScriptAnalyzer settings file |

```powershell
properties {
    # Fail on warnings too
    $PSBPreference.Test.ScriptAnalysis.FailBuildOnSeverityLevel = 'Warning'

    # Use a custom ruleset
    $PSBPreference.Test.ScriptAnalysis.SettingsPath = "$PSScriptRoot/.psscriptanalyzer.psd1"
}
```

### Code Coverage

| Setting | Default | Description |
|---------|---------|-------------|
| `Test.CodeCoverage.Enabled` | `$false` | Enable code coverage reporting |
| `Test.CodeCoverage.Threshold` | `0.75` | Minimum coverage ratio (0.0–1.0); build fails below this |
| `Test.CodeCoverage.Files` | (staged module files) | Files included in coverage analysis |
| `Test.CodeCoverage.OutputFile` | `$null` | Path to write the coverage report |
| `Test.CodeCoverage.OutputFileFormat` | `'JaCoCo'` | Coverage report format |

```powershell
properties {
    $PSBPreference.Test.CodeCoverage.Enabled          = $true
    $PSBPreference.Test.CodeCoverage.Threshold        = 0.80
    $PSBPreference.Test.CodeCoverage.OutputFile       = "$PSScriptRoot/coverage.xml"
    $PSBPreference.Test.CodeCoverage.OutputFileFormat = 'JaCoCo'
}
```

---

## Help

| Setting | Default | Description |
|---------|---------|-------------|
| `Help.DefaultLocale` | `'en-US'` | Locale used when generating MAML and updatable help |
| `Help.UpdatableHelpOutDir` | `$null` | Directory where updatable help `.cab` files are written |
| `Help.ConvertReadMeToAboutHelp` | `$false` | Convert `README.md` to an `about_<ModuleName>.help.txt` file |

---

## Docs

| Setting | Default | Description |
|---------|---------|-------------|
| `Docs.RootDir` | `$ProjectRoot/docs` | Directory for PlatyPS markdown source files |
| `Docs.Overwrite` | `$false` | Overwrite existing markdown files when regenerating |
| `Docs.AlphabeticParamsOrder` | `$false` | Sort parameters alphabetically in generated markdown |
| `Docs.ExcludeDontShow` | `$false` | Exclude parameters marked `[DontShow]` |
| `Docs.UseFullTypeName` | `$false` | Use fully-qualified type names instead of short names |

---

## Publish

| Setting | Default | Description |
|---------|---------|-------------|
| `Publish.PSRepository` | `'PSGallery'` | Name of the PowerShell repository to publish to |
| `Publish.PSRepositoryApiKey` | `$null` | API key for authenticating with the repository |
| `Publish.PSRepositoryCredential` | `$null` | `PSCredential` for authenticating with the repository |

```powershell
properties {
    $PSBPreference.Publish.PSRepository      = 'PSGallery'
    $PSBPreference.Publish.PSRepositoryApiKey = $env:PSGALLERY_API_KEY
}
```

---

## Sign

| Setting | Default | Description |
|---------|---------|-------------|
| `Sign.Enabled` | `$false` | Enable Authenticode signing |
| `Sign.CertificateSource` | `'Auto'` | How to resolve the signing certificate (`'Auto'`, `'CertStore'`, `'Thumbprint'`, `'EnvVar'`, `'PfxFile'`) |
| `Sign.CertStoreLocation` | `$null` | Certificate store path (e.g., `'Cert:\CurrentUser\My'`) |
| `Sign.Thumbprint` | `$null` | Specific certificate thumbprint |
| `Sign.CertificateEnvVar` | `'SIGNCERTIFICATE'` | Environment variable containing a Base64-encoded PFX |
| `Sign.CertificatePasswordEnvVar` | `$null` | Environment variable containing the PFX password |
| `Sign.PfxFilePath` | `$null` | Path to a PFX/P12 file |
| `Sign.PfxFilePassword` | `$null` | Password for the PFX file |
| `Sign.SkipCertificateValidation` | `$false` | Skip certificate validity checks (not recommended for production) |
| `Sign.TimestampServer` | `$null` | RFC 3161 timestamp server URI |
| `Sign.HashAlgorithm` | `'SHA256'` | Authenticode hash algorithm |
| `Sign.FilesToSign` | `@('*.psd1','*.psm1','*.ps1')` | File patterns to sign in the output directory |

### Catalog

| Setting | Default | Description |
|---------|---------|-------------|
| `Sign.Catalog.Enabled` | `$false` | Create a Windows catalog (`.cat`) file |
| `Sign.Catalog.Version` | `2` | Catalog hash version |
| `Sign.Catalog.FileName` | (module name) | Catalog filename (without `.cat` extension) |

```powershell
properties {
    $PSBPreference.Sign.Enabled          = $true
    $PSBPreference.Sign.CertificateSource = 'EnvVar'
    $PSBPreference.Sign.TimestampServer  = 'http://timestamp.digicert.com'
    $PSBPreference.Sign.Catalog.Enabled  = $true
}
```

---

## Task Dependency Variables

To change which tasks a given task depends on, set these variables **outside** the `properties` block, before any PowerShellBuild task references:

| Variable | Controls dependencies of | Default |
|----------|--------------------------|---------|
| `$PSBCleanDependency` | `Clean` | `'Init'` |
| `$PSBStageFilesDependency` | `StageFiles` | `'Clean'` |
| `$PSBBuildHelpDependency` | `BuildHelp` | `'GenerateMarkdown', 'GenerateMAML'` |
| `$PSBGenerateMarkdownDependency` | `GenerateMarkdown` | `'StageFiles'` |
| `$PSBGenerateMAMLDependency` | `GenerateMAML` | `'GenerateMarkdown'` |
| `$PSBGenerateUpdatableHelpDependency` | `GenerateUpdatableHelp` | `'BuildHelp'` |
| `$PSBBuildDependency` | `Build` | `'StageFiles', 'BuildHelp'` |
| `$PSBAnalyzeDependency` | `Analyze` | `'Build'` |
| `$PSBPesterDependency` | `Pester` | `'Build'` |
| `$PSBTestDependency` | `Test` | `'Pester', 'Analyze'` |
| `$PSBPublishDependency` | `Publish` | `'Test'` |
| `$PSBSignModuleDependency` | `SignModule` | `'Build'` |
| `$PSBBuildCatalogDependency` | `BuildCatalog` | `'SignModule'` |
| `$PSBSignCatalogDependency` | `SignCatalog` | `'BuildCatalog'` |
| `$PSBSignDependency` | `Sign` | `'SignCatalog'` |

### Example: Remove Analyze from the Test pipeline

```powershell title="psakeFile.ps1"
# Set outside properties block
$PSBTestDependency = 'Pester'   # Test only depends on Pester, not Analyze

properties {
    $PSBPreference.Test.ScriptAnalysis.Enabled = $false
}

task default -depends Test
task Test -FromModule PowerShellBuild -Version '0.7.1'
```

## See Also

- [Task Reference](./task-reference) — What each task does
- [Getting Started](./getting-started) — Minimal project setup
- [Real-World Example](./real-world-example) — Configuration in context
