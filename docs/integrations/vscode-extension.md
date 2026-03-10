---
sidebar_position: 1
title: VS Code Extension
description: Install and configure the psake VS Code extension for task discovery, CodeLens, and build automation directly in your editor.
---

# VS Code Extension

The [psake VS Code extension](https://github.com/psake/psake-vscode) integrates psake's build system directly into Visual Studio Code. It automatically discovers your tasks, provides a dedicated explorer panel, and lets you run builds without leaving the editor.

## Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/) v1.90 or later
- [PowerShell extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.PowerShell) for VS Code

## Installation

Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/publishers/psake), or search for **psake** in the Extensions panel (`Ctrl+Shift+X`).

The extension activates automatically when your workspace contains a `psakefile.ps1`, `psake.ps1`, or `build.ps1`.

## Features

### Task Provider

The extension scans your `psakefile.ps1` and registers all tasks with VS Code's task system. Your default task is mapped to the Build group, so pressing `Ctrl+Shift+B` runs it immediately.

Tasks refresh automatically when you save your build file.

You can also reference psake tasks in `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "psake",
      "task": "Build"
    }
  ]
}
```

### psake Tasks Explorer

A sidebar panel in the Explorer view lists all discovered tasks with their descriptions and dependencies. From here you can:

- **Run** any task with a single click
- **Navigate** to a task's definition in your build file
- **View** task dependencies at a glance

### CodeLens

Each `Task` declaration in your build file displays a **Run Task** action inline. Click it to execute the task directly from the editor.

To disable CodeLens, set `psake.codeLens.enabled` to `false`.

### Build Script Detection

If your project includes a wrapper script such as `build.ps1`, the extension routes execution through it automatically. This ensures bootstrapping, dependency installation, and other setup steps run correctly.

Set `psake.buildScript` to `"none"` to disable wrapper detection and call `Invoke-psake` directly.

### Task Sync & IntelliSense

- **Sync command**: Run `psake: Sync Tasks to tasks.json` to add all discovered tasks to your workspace configuration while preserving existing customizations.
- **IntelliSense**: The `"task"` property in `.vscode/tasks.json` provides autocomplete for psake task names when using the `psake` type.

### Snippets

Nine built-in snippets help you scaffold build files quickly:

| Prefix | Description |
|---|---|
| `psakeTask` | Basic task definition |
| `psakeTaskFull` | Task with all options |
| `psakeTaskDependsOnly` | Task that only declares dependencies |
| `psakeProperties` | Properties block |
| `psakeInclude` | Include statement |
| `psakeFramework` | Framework block |
| `psakeFormatTaskName` | FormatTaskName block |
| `psakeTaskSetup` | TaskSetup block |
| `psakeTaskTearDown` | TaskTearDown block |

### Scaffold Command

Run `psake: Install sample build file` to generate a starter `psakefile.ps1` with example tasks in your workspace.

## Configuration

All settings are under the `psake` namespace and update dynamically without restarting VS Code.

| Setting | Default | Description |
|---|---|---|
| `psake.buildFile` | `psakefile.ps1` | Default build file name |
| `psake.taskProvider.enabled` | `true` | Enable automatic task detection |
| `psake.codeLens.enabled` | `true` | Show Run Task CodeLens above task declarations |
| `psake.buildScript` | `""` (auto-detect) | Path to wrapper build script, or `"none"` to disable |
| `psake.buildScriptTaskParameter` | `Task` | Parameter name the build script uses for task selection |
| `psake.buildScriptParameters` | `""` | Additional parameters passed to the build script |
| `psake.invokeParameters` | `""` | Additional parameters passed to `Invoke-psake` |
| `psake.powershellExecutable` | `""` (auto-detect) | Path to PowerShell executable |
| `psake.shellArgs` | `["-NoProfile"]` | Arguments passed to the PowerShell executable |

## Troubleshooting

**Tasks not appearing?**
- Verify your build file is named `psakefile.ps1` (or matches your `psake.buildFile` setting)
- Check that `psake.taskProvider.enabled` is `true`
- Run `psake: Refresh Tasks` from the Command Palette

**Build script not detected?**
- The extension looks for `build.ps1` in the workspace root by default
- Set `psake.buildScript` explicitly if your wrapper has a different name or location

**Using a non-standard PowerShell?**
- Set `psake.powershellExecutable` to the full path of your PowerShell binary

## Further Reading

- [psake VS Code extension on GitHub](https://github.com/psake/psake-vscode)
- [Debugging psake in VS Code](../troubleshooting/debugging-guide.md)
- [psake Agent Skill for AI-assisted builds](/blog/introducing-psake-agent-skill)
