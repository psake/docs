---
sidebar_position: 1
---

# Quick Start

*psake* is a build automation tool written in PowerShell. It avoids the
angle-bracket tax associated with executable XML by leveraging the PowerShell
syntax in your build scripts. psake has a syntax inspired by rake (aka make in
Ruby) and bake (aka make in Boo), but is easier to script because it leverages
your existent command-line knowledge.

psake is pronounced sake - as in Japanese rice wine. It does NOT rhyme with
make, bake, or rake.

## Installing psake

### Via PowerShell

To install psake use the built-in PowerShell package manager.

Launch PowerShell and run the following command.

```powershell
# PowerShellGet
Install-Module psake

# PSResourceGet
Install-PSResource psake
```

### Via Chocolatey

```powershell
choco install psake
```

### Via NuGet

You can download through the various mechanisms available for NuGet

[psake - nuget.org](https://www.nuget.org/packages/psake/)

### Via GitHub

You can also download ZIP files of the project "binaries" from GitHub by
selecting the appropriate [release](https://github.com/psake/psake/releases).

## What can psake be used for?

You can use **psake** for many things, building software, deploying software, back-end processing, etc...
psake is written in PowerShell, so you have access to the entire .NET framework.

## How does psake work?

**psake** is a domain specific language to create builds using a dependency
pattern just like Ant, NAnt, Rake or MSBuild.

You create a build script using PowerShell that consists of `Tasks` which are
simply function calls. Each `Task` function can define dependencies on other
`Task` functions.

In the example script below, Task `Compile` depends on Tasks `Clean` and `Init`,
which means that before Task `Compile` can execute, both tasks `Clean` and
`Init` have to execute. psake ensures that this is done.

```powershell
Task Compile -Depends Init,Clean {
   "compile"
}

Task Clean -Depends Init {
   "clean"
}

Task Init {
   "init"
}
```

psake reads in your build script and executes the `Task` functions that are
defined within it and enforces the dependencies between tasks. The great thing
about psake is that it is written in PowerShell and that means you have the
power of .NET and all the features of PowerShell at your disposal within your
build script. Not to mention that you don't have to pay the *XML* bracket tax
anymore.

## Who is using psake?

The following is a list (at the time of writing) of projects who are using psake
to orchestrate their build process.

* [ChocolateyGUI](https://github.com/chocolatey/ChocolateyGUI)
* [BoxStarter](https://github.com/mwrock/boxstarter)
* [ravendb](https://github.com/ravendb/ravendb)
* [Hangfire](https://github.com/HangfireIO/Hangfire)
* [Json.Net](https://github.com/JamesNK/Newtonsoft.Json)
* [Lucene.NET](https://github.com/apache/lucenenet)
* [Spatial4n](https://github.com/Spatial4n/Spatial4n)
* [J2N](https://github.com/NightOwl888/J2N)
* [ICU4N](https://github.com/NightOwl888/ICU4N)
* [RandomizedTesting](https://github.com/NightOwl888/RandomizedTesting)

## Documentation Guide

### Getting Started

New to psake? Start here:

- **[Installing psake](/docs/tutorial-basics/installing)** - Installation methods and prerequisites
- **[Running psake](/docs/tutorial-basics/run-psake)** - Your first psake build
- **[Tasks](/docs/tutorial-basics/tasks)** - Understanding tasks and dependencies
- **[Parameters and Properties](/docs/tutorial-basics/parameters-properties)** - Configuring your builds

### Build Type Examples

Learn how to use psake with different project types:

- **[.NET Solutions](/docs/build-types/dot-net-solution)** - Building .NET projects with MSBuild
- **[Node.js Projects](/docs/build-types/nodejs)** - npm, TypeScript, and Webpack builds
- **[Docker Builds](/docs/build-types/docker)** - Building and publishing Docker images

### CI/CD Integration

Integrate psake with your CI/CD pipeline:

- **[GitHub Actions](/docs/ci-examples/github-actions)** - Complete GitHub Actions setup
- **[Azure Pipelines](/docs/ci-examples/azure-pipelines)** - Azure DevOps integration
- **[GitLab CI](/docs/ci-examples/gitlab-ci)** - GitLab CI/CD configuration

### Troubleshooting

Having issues? Check these resources:

- **[Common Errors](/docs/troubleshooting/common-errors)** - Solutions to frequent problems
- **[FAQ](/docs/troubleshooting/faq)** - Frequently asked questions
- **[Debugging Guide](/docs/troubleshooting/debugging-guide)** - Debugging build scripts

### Reference

Quick reference and comprehensive documentation:

- **[Glossary](/docs/reference/glossary)** - Definitions of psake terms and concepts
- **[Cheat Sheet](/docs/reference/cheat-sheet)** - Quick reference for common patterns
- **[Configuration Reference](/docs/reference/configuration-reference)** - All configuration options
- **[Exit Codes](/docs/reference/exit-codes)** - Understanding exit codes in CI/CD
