---
title: "psake Meets VS Code: The Official Extension Hits v1.0"
description: "The psake VS Code extension v1.0 brings task discovery, CodeLens integration, a dedicated task explorer, and smart build script detection directly into your editor."
date: 2026-03-10T18:00:00.000Z
slug: psake-vscode-extension-v1
authors:
  - heyitsgilbert
tags:
  - announcement
  - release
  - psake
  - powershell
  - vscode
keywords:
  - psake
  - VS Code
  - Visual Studio Code
  - extension
  - task runner
  - build automation
  - PowerShell
  - CodeLens
  - developer tools
image: /img/og-image.png
draft: false
fmContentType: blog
title_meta: "psake VS Code Extension v1.0"
---

We're thrilled to announce the v1.0 release of the [psake VS Code extension](https://github.com/psake/psake-vscode)—bringing first-class psake support directly into the world's most popular code editor. If you've been running psake from the terminal, you can now discover, navigate, and execute your build tasks without ever leaving VS Code.

<!-- truncate -->

## Why a VS Code Extension?

A core part of our mission with psake is meeting developers where they already work. Whether that's through [AI-assisted workflows with Agent Skills](/blog/introducing-psake-agent-skill), CI/CD pipelines, or your daily editor—we want psake to feel native to your environment. With VS Code being the editor of choice for so many PowerShell developers, a dedicated extension was a natural next step.

## What's in v1.0

This isn't a minimal snippet pack. The v1.0 release is a full-featured integration that makes VS Code aware of your psake build system.

### Task Provider

The extension automatically detects tasks from your `psakefile.ps1` and surfaces them in VS Code's built-in task system. Your default task maps to the Build group, so `Ctrl+Shift+B` just works. Tasks refresh automatically when you save your build file—no manual reload needed.

### psake Tasks Explorer

A dedicated sidebar panel in the Explorer view gives you an at-a-glance view of every task in your project, complete with descriptions and dependency chains. Click any task to navigate directly to its definition, or hit the run button to execute it immediately.

### CodeLens Integration

Every `Task` declaration in your build file gets a "Run Task" CodeLens action. See a task, run it—right from the editor gutter. It's the fastest path from reading build logic to executing it.

### Smart Build Script Detection

If your project uses a wrapper script like `build.ps1` (a common pattern in the psake ecosystem), the extension detects it automatically and routes task execution through it. This means your bootstrapping, dependency installation, and any custom setup all run correctly—just as they would from the terminal.

### tasks.json IntelliSense

When you configure psake tasks in `.vscode/tasks.json`, the extension provides autocomplete for task names. Combined with the new "psake: Sync Tasks to tasks.json" command, you can quickly wire up your build tasks into VS Code's task runner with full IntelliSense support.

### Nine Code Snippets

Scaffolding new tasks and build file structures is faster with nine built-in snippets covering everything from basic task definitions to `Properties`, `Include`, `Framework`, `FormatTaskName`, `TaskSetup`, and `TaskTearDown` blocks.

## Quick Start

1. Install the [psake extension](https://marketplace.visualstudio.com/publishers/psake) from the VS Code Marketplace
2. Make sure you have the [PowerShell extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.PowerShell) installed
3. Open a project that contains a `psakefile.ps1` or `build.ps1`
4. The extension activates automatically—check the Explorer sidebar for the psake Tasks panel

That's it. No configuration required—but there's plenty available if you need it.

## Fully Configurable

The extension works out of the box, but every aspect of its behavior can be tuned to fit your workflow. Toggle CodeLens on or off, point to a custom PowerShell executable, pass extra parameters to `Invoke-psake` or your build script, and customize shell arguments—all without restarting VS Code.

For the full list of settings, check out the [VS Code extension docs](/docs/integrations/vscode-extension#configuration).

## Part of a Growing Ecosystem

The VS Code extension joins a growing set of tools designed to make psake easy to use wherever you are:

- **[psake](https://github.com/psake/psake)** — The build automation engine
- **[PowerShellBuild](https://github.com/psake/PowerShellBuild)** — Common build tasks for PowerShell modules
- **[psake Agent Skill](https://github.com/psake/psake-llm-tools)** — AI-assisted psake expertise for Claude and GitHub Copilot
- **[psake VS Code Extension](https://github.com/psake/psake-vscode)** — First-class editor integration

We're committed to making psake feel at home in every part of your development workflow. If you have ideas for where psake should go next, [open an issue](https://github.com/psake/psake-vscode/issues) or join the conversation.

Give the extension a try and let us know what you think!
