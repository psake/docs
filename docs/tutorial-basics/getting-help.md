---
description: Learn how to get help with psake - built-in documentation and community support
sidebar_position: 3
---

# Getting Help

## Built-in Help

### View Available Tasks

To see a list of all tasks defined in your psake build script, use the `-Docs` parameter:

```powershell
Invoke-psake -Docs
```

This will print the current tasks list from your psake file, showing all available tasks and their descriptions.

### PowerShell Help System

You can use the PowerShell `Get-Help` command on the `Invoke-psake` function to get detailed help:

```powershell
# First import the psake module
Import-Module psake

# View full help for Invoke-psake
Get-Help Invoke-psake -Full
```

### List Available Commands

To see all functions available in the psake module:

```powershell
Get-Command -Module psake

# Output:
# CommandType     Name                Definition
# -----------     ----                ----------
# Function        Assert              ...
# Function        Exec                ...
# Function        FormatTaskName      ...
# Function        Include             ...
# Function        Invoke-psake        ...
# Function        Properties          ...
# Function        Task                ...
# Function        TaskSetup           ...
# Function        TaskTearDown        ...
```

### Get Examples for Specific Commands

Use `Get-Help` with the `-Examples` parameter to see usage examples:

```powershell
Get-Help Assert -Examples

# Output:
# NAME
#     Assert
#
# SYNOPSIS
#     Helper function for "Design by Contract" assertion checking.
#
# -------------------------- EXAMPLE 1 --------------------------
# Assert $false "This always throws an exception"
#
# -------------------------- EXAMPLE 2 --------------------------
# Assert ( ($i % 2) -eq 0 ) "$i is not an even number"
```

## Community Support

Need help with your build scripts? The psake community is here to help!

### Chat & Discussion

- **[PowerShell Discord](https://aka.ms/psdiscord)** - Join the #psake channel for real-time chat
- **[PowerShell Slack](https://aka.ms/psslack)** - Join the #psake channel for team collaboration
- **[GitHub Discussions](https://github.com/orgs/psake/discussions)** - For long-form questions and discussions

### Q&A

- **[Stack Overflow](https://stackoverflow.com/questions/tagged/psake)** - Search existing questions or ask new ones using the `psake` tag

### Report Issues

Found a bug or have a feature request?

- **[GitHub Issues](https://github.com/psake/psake/issues)** - Report bugs or request features in the main psake repository

## Documentation

For comprehensive guides and reference materials:

- **[Command Reference](/docs/commands/Invoke-psake)** - Detailed documentation for all psake commands
- **[Troubleshooting](/docs/troubleshooting/common-errors)** - Solutions to common problems
- **[FAQ](/docs/troubleshooting/faq)** - Frequently asked questions
