---
title: "LLM Tools"
description: "Machine-readable documentation and AI assistant integrations for psake, including llms.txt files and the psake Agent Skill"
---

# LLM Tools

psake provides several tools to help Large Language Models (LLMs) and AI coding assistants understand and work with your build automation. These tools make it easier to get AI-assisted help when writing psakefiles, troubleshooting builds, or learning psake concepts.

## Machine-Readable Documentation

### llms.txt

The psake documentation site provides machine-readable text files optimized for LLMs:

| File | Description | URL |
|------|-------------|-----|
| `llms.txt` | Condensed site overview with key pages | [psake.dev/llms.txt](https://psake.dev/llms.txt) |
| `llms-full.txt` | Complete site content as markdown | [psake.dev/llms-full.txt](https://psake.dev/llms-full.txt) |

These files follow the [llms.txt standard](https://llmstxt.org/) for providing website content in a format that LLMs can easily consume.

### When to Use Each File

**Use `llms.txt` when:**
- You need a quick overview of psake
- Your LLM has limited context window
- You want to provide general psake knowledge

**Use `llms-full.txt` when:**
- You need comprehensive documentation
- You're troubleshooting complex issues
- You want the AI to have access to all examples and reference material

### Example Usage

You can paste the contents of these files directly into your AI conversation, or reference the URLs when using tools that support web fetching:

```
Please read https://psake.dev/llms-full.txt and help me create a psakefile
for a .NET solution with multiple projects.
```

## psake Agent Skill

The [psake Agent Skill](https://github.com/psake/psake-llm-tools) is a specialized knowledge package that enables AI coding assistants like Claude and GitHub Copilot to provide expert assistance with psake build automation tasks.

### What is an Agent Skill?

Agent Skills are portable knowledge packages built on the open [Agent Skills](https://agentskills.io/) standard. They provide structured expertise that AI assistants can use to give more accurate, context-aware guidance for specific tools and technologies.

### What's Included

The psake Agent Skill includes four comprehensive knowledge components:

| Component | Description |
|-----------|-------------|
| **SKILL.md** | Core psake fundamentals—command syntax, task definitions, dependencies, and troubleshooting patterns |
| **PowerShell Modules Reference** | Guidance on using PowerShellBuild for module development workflows |
| **Build Types Reference** | Practical patterns for .NET, Node.js, and Docker builds |
| **Advanced Reference** | Dynamic task generation, custom logging, and CI/CD integration |

### What AI Assistants Can Help With

Once you've loaded the psake skill, your AI assistant can help with:

- Building complete psakefiles with integrated Pester testing frameworks
- Establishing build configurations for .NET solutions and PowerShell modules
- Implementing dynamic task generation from configuration files
- Troubleshooting build failures and dependency issues
- Integrating psake workflows into CI/CD pipelines
- Creating custom logging mechanisms
- Developing cross-platform build scripts

### Installation

#### Using with Claude

1. Visit the [psake-llm-tools repository](https://github.com/psake/psake-llm-tools)
2. Download the `psake.skill` file from the releases section
3. Upload it to Claude through the skills interface
4. Start building with AI-assisted psake expertise

#### Using with GitHub Copilot

1. Download the `psake.skill` file from the [repository](https://github.com/psake/psake-llm-tools)
2. Follow the [VS Code instructions for using shared skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills#_use-shared-skills)
3. Configure the skill in your workspace or user settings
4. Access psake expertise directly in your editor

The same skill file works across both platforms, making it easy to maintain consistent AI assistance regardless of which tool you prefer.

## Best Practices

### Getting Better AI Assistance

When asking AI assistants for help with psake:

1. **Provide context** - Share your current psakefile or describe your project structure
2. **Be specific** - Mention the specific task, error, or pattern you need help with
3. **Share error messages** - Include full error output when troubleshooting
4. **Mention your environment** - PowerShell version, OS, and any relevant modules

### Example Prompts

Here are some effective ways to ask for psake help:

```
I'm using psake to build a .NET 8 solution. Help me create a task that
runs tests with code coverage and fails if coverage is below 80%.
```

```
My psake build is failing with "Task 'Deploy' has not been defined."
Here's my psakefile: [paste code]. What's wrong?
```

```
How do I pass parameters from my CI/CD pipeline to my psakefile?
I'm using GitHub Actions.
```

## Contributing

The psake-llm-tools repository is open source and welcomes community contributions. If you have patterns, examples, or improvements that would benefit other developers using psake with AI assistants, we'd love to see your pull requests.

Visit [github.com/psake/psake-llm-tools](https://github.com/psake/psake-llm-tools) to contribute.

## See Also

- [Quick Start](/docs/intro) - Get started with psake
- [Cheat Sheet](/docs/reference/cheat-sheet) - Quick reference for common patterns
- [Command Reference](/docs/commands/Invoke-psake) - Detailed command documentation
- [Troubleshooting](/docs/troubleshooting/common-errors) - Common errors and solutions
