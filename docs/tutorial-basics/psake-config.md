# psake Configuration File

psake loads a `psake-config.ps1` file at the start of every build to set default values for your build environment. You can use this file to change psake's default build file name, framework version, task name format, output handlers, and more.

## How psake Finds the Config File

psake searches for `psake-config.ps1` in two locations, in order:

1. **The build script's directory** — the folder containing the build file passed to `Invoke-psake`
2. **The psake module directory** — the folder where `psake.psm1` is installed

The first file found wins. If neither location contains a config file, psake uses its built-in defaults.

This means you can place a `psake-config.ps1` next to your `psakefile.ps1` to customize settings per-project, or place one alongside the psake module for machine-wide defaults.

## Configuration Properties

Inside `psake-config.ps1`, you set properties on the `$config` variable. Here is every available property:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `buildFileName` | `string` | `"psakefile.ps1"` | Default build file name when none is specified |
| `legacyBuildFileName` | `string` | `"default.ps1"` | Fallback build file name (legacy support) |
| `framework` | `string` | `"4.0"` | .NET Framework version to target |
| `taskNameFormat` | `string` or `scriptblock` | `"Executing {0}"` | Format string or scriptblock for task name display |
| `verboseError` | `bool` | `$false` | Show detailed error information |
| `coloredOutput` | `bool` | `$true` | Enable colored console output |
| `modules` | `string[]` | `$null` | Module paths to auto-load before build execution |
| `moduleScope` | `string` | — | Scope for loaded modules |
| `outputHandler` | `scriptblock` | *(routes to outputHandlers)* | Master handler that receives all output |
| `outputHandlers` | `hashtable` | *(see below)* | Per-type output handlers |

## Minimal Example

```powershell title="psake-config.ps1"
# Use a different default build file name
$config.buildFileName = "build.ps1"

# Target .NET 4.8
$config.framework = "4.8"

# Show detailed errors
$config.verboseError = $true
```

## Task Name Formatting

`taskNameFormat` accepts either a format string or a scriptblock:

```powershell title="psake-config.ps1"
# Format string — {0} is replaced with the task name
$config.taskNameFormat = "Executing {0}"

# Scriptblock — receives the task name as a parameter
$config.taskNameFormat = {
    param($taskName)
    "Executing $taskName at $(Get-Date)"
}
```

## Auto-Loading Modules

Use `$config.modules` to load PowerShell modules before any tasks run:

```powershell title="psake-config.ps1"
# Load all modules from a folder
$config.modules = @(".\modules\*.psm1")

# Load specific modules
$config.modules = @(".\modules\*.psm1", ".\my_module.psm1")
```

## Output Handlers

psake routes all internal messages through configurable output handlers. For a full guide on customizing logging, see [Custom Logging](../tutorial-advanced/custom-logging.md).

## See Also

- [Custom Logging](../tutorial-advanced/custom-logging.md) — Override psake's output handlers
- [Configuration Reference](../reference/configuration-reference.md) — Full reference for `Invoke-psake` parameters and build script settings
- [Structure of a psake Build Script](../tutorial-advanced/structure-of-a-psake-build-script.md) — How build scripts are organized
