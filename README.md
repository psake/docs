# psake Docs Site

[![Netlify Status](https://api.netlify.com/api/v1/badges/08957aba-db0d-4321-b752-93097e70fd6a/deploy-status)](https://app.netlify.com/sites/psake/deploys)

This website is built using [Docusaurus](https://docusaurus.io/), a modern
static website generator. The main feature for us was it's ability to
support versioned docs.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18.0
- [Yarn](https://classic.yarnpkg.com/) (`npm install -g yarn`)
- [PowerShell 7+](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell) (`pwsh`)

## Installation

```powershell
.\build.ps1 -Bootstrap
```

## Local Development

```powershell
.\build.ps1 -Task Server
```

This command starts a local development server and opens up a browser window.
Most changes are reflected live without having to restart the server.

## Build

```powershell
.\build.ps1 -Task Build
```

This command generates static content into the `build` directory and can be
served using any static contents hosting service.

### Deployment

We use Netlify to deploy when changes are landed into main.
