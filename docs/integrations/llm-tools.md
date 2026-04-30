---
sidebar_position: 2
title: LLM Tools & Marketplace
description: Install and use psake Claude skills from the psake-llm-tools marketplace to get AI-assisted build automation in Claude Code and VS Code.
---

# LLM Tools & Marketplace

The [psake-llm-tools](https://github.com/psake/psake-llm-tools) repository is a Claude skill marketplace that brings psake build automation knowledge directly into Claude Code and VS Code Copilot Chat. Install a skill once and Claude will understand your psake build files, suggest tasks, and generate idiomatic psake code.

## Available Skills

| Skill | Description |
|---|---|
| **psake** | Task-based build automation for .NET, Node.js, Docker, and more |
| **PowerShellBuild** | Standardized build, test, and publish tasks for PowerShell module development |

## Installation

### Marketplace (recommended)

Add the psake marketplace in Claude Code, then install whichever skills you need:

```
/plugin marketplace add psake/psake-llm-tools
```

Once the marketplace is added, install individual skills:

```
/plugin install psake@psake-tools
/plugin install powershellbuild@psake-tools
```

### VS Code

If you use VS Code, paste the following link into your browser's address bar to add the marketplace directly:

```
vscode://chat-plugin/install?source=https://github.com/psake/psake-llm-tools/
```

### Direct download

Download a `.skill` file from the [releases page](https://github.com/psake/psake-llm-tools/releases) and upload it directly to Claude. Both `.skill` files and marketplace installation are kept in sync.

## psake Skill

The **psake** skill teaches Claude the full psake DSL and common build patterns.

### What's Included

- **Core patterns** — task definitions, dependencies, properties, and the `Invoke-psake` API
- **Build types** — .NET, Node.js, and Docker build patterns
- **PowerShell modules** — integration with the PowerShellBuild module
- **Advanced topics** — dynamic tasks, custom logging, and CI/CD integration

### Usage Examples

Once installed, ask Claude to:

- "Create a psakefile for my PowerShell module with Pester tests"
- "Help me set up a psake build for my .NET solution"
- "Generate a psakefile that creates tasks dynamically from a config file"
- "Add CI/CD integration to my existing psakefile"

## PowerShellBuild Skill

The **PowerShellBuild** skill covers the [PowerShellBuild](https://github.com/psake/PowerShellBuild) module, which provides a standard set of psake tasks for building, testing, and publishing PowerShell modules.

### What's Included

- **PSBPreference settings** — all configuration properties with defaults and descriptions
- **Task reference** — every built-in task and when to use it
- **Complete project examples** — from bare module to fully configured build
- **CI/CD patterns** — Azure Pipelines, GitHub Actions, and more

### Usage Examples

Once installed, ask Claude to:

- "Set up PowerShellBuild for my PowerShell module"
- "Configure code coverage thresholds in my PowerShellBuild project"
- "Help me publish my module to PSGallery using PowerShellBuild"
- "Generate a psakeFile.ps1 using PowerShellBuild tasks"

## Further Reading

- [psake-llm-tools on GitHub](https://github.com/psake/psake-llm-tools)
- [VS Code Extension](./vscode-extension.md)
- [psake Agent Skill for AI-assisted builds](/blog/introducing-psake-agent-skill)
