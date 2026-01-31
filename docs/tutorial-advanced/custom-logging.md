# Custom Logging

psake routes all internal messages through configurable output handlers. You can override these handlers in your [`psake-config.ps1`](./psake-config.md) file to integrate with your own logging system.

## Default Handlers

psake ships with handlers for six message types:

| Type | Default Behavior |
|------|-----------------|
| `heading` | Cyan colored output |
| `default` | `Write-Output` |
| `debug` | `Write-Debug` |
| `warning` | Yellow colored output |
| `error` | Red colored output |
| `success` | Green colored output |

Unknown message types fall back to the `default` handler.

## Override Specific Message Types

To customize how individual message types are handled, override entries in `$config.outputHandlers` in your `psake-config.ps1`:

```powershell
# psake-config.ps1

# Send warnings to a log file instead of the console
$config.outputHandlers.warning = {
    Param($output)
    Add-Content -Path "build-warnings.log" -Value $output
}

# Suppress debug messages entirely
$config.outputHandlers.debug = {
    Param($output)
    # do nothing
}
```

Each handler receives a single `$output` parameter containing the message string.

## Override All Logging

To replace the entire routing logic, override `$config.outputHandler` (singular). This script block receives both the message and its type, giving you full control:

```powershell
# psake-config.ps1

$config.outputHandler = {
    Param($output, $type)
    # Route everything through your custom logger
    Write-MyBuildLog -Message $output -Level $type
}
```

When you override `outputHandler`, the individual `outputHandlers` entries are bypassed entirely.

## Example: Log to a File

```powershell
# psake-config.ps1

$config.outputHandler = {
    Param($output, $type)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$type] $output"
    Add-Content -Path "build.log" -Value $line
    # Still write to console
    Write-Host $line
}
```
