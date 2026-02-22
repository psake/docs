---
title: "PowerShellBuild v0.8.0: Authenticode Signing & New Documentation"
description: "PowerShellBuild v0.8.0 brings Authenticode code-signing support for PowerShell modules, and comprehensive docs are now available on the psake docs site."
date: 2026-02-21T18:00:00.000Z
slug: powershellbuild-v0.8.0-signing-and-docs
authors:
  - heyitsgilbert
tags:
  - announcement
  - release
  - powershell
  - build-automation
  - psake
  - deployment
keywords:
  - PowerShellBuild
  - Authenticode
  - code signing
  - certificate
  - PowerShell module signing
  - build automation
  - psake
draft: false
fmContentType: blog
---

Two exciting updates to share today: **PowerShellBuild v0.8.0** has been released with built-in Authenticode code-signing support, and we've added a comprehensive [PowerShellBuild documentation section](/docs/powershellbuild/introduction) right here on the psake docs site.

<!-- truncate -->

## PowerShellBuild Docs Are Now on the psake Site

If you've been looking for guidance on using PowerShellBuild to streamline your PowerShell module builds, you no longer need to piece things together from the README alone. The psake docs site now has a dedicated **PowerShellBuild** section covering:

- [**Introduction**](/docs/powershellbuild/introduction) — What PowerShellBuild is and how it relates to psake
- [**Getting Started**](/docs/powershellbuild/getting-started) — Installation and first-build walkthrough
- [**Configuration**](/docs/powershellbuild/configuration) — Deep dive into `$PSBPreference` and how to customize every aspect of your build
- [**Task Reference**](/docs/powershellbuild/task-reference) — Complete listing of all available tasks and their dependencies
- [**Real-World Example**](/docs/powershellbuild/real-world-example) — A practical end-to-end project setup

## What's New in v0.8.0 — Authenticode Signing

The headline feature in [PowerShellBuild v0.8.0](https://github.com/psake/PowerShellBuild/releases/tag/v0.8.0) is full Authenticode code-signing support for PowerShell modules. This was a highly requested capability, and it's now baked right into the standard build pipeline.

### Three New Public Functions

**`Get-PSBuildCertificate`** resolves a code-signing `X509Certificate2` from five different sources:

- **Auto** — Automatically detects from environment variables or the certificate store
- **Windows certificate store** — With optional thumbprint filtering
- **Base64-encoded PFX** — From environment variables, ideal for CI/CD pipelines
- **PFX file on disk** — With optional password protection
- **Pre-resolved certificate object** — For custom providers like Azure Key Vault

**`Invoke-PSBuildModuleSigning`** signs your module files (`.psd1`, `.psm1`, `.ps1`) with Authenticode signatures. It supports configurable timestamp servers and hash algorithms including SHA256, SHA384, and SHA512.

**`New-PSBuildFileCatalog`** creates Windows catalog (`.cat`) files that record cryptographic hashes of your module's contents for tamper detection.

### Four New Build Tasks

| Task | Description |
|------|-------------|
| `SignModule` | Signs module files with Authenticode |
| `BuildCatalog` | Creates a Windows catalog file |
| `SignCatalog` | Signs the catalog file |
| `Sign` | Meta-task that orchestrates the full signing pipeline |

These tasks slot into the existing build pipeline with proper dependency ordering: **Build → SignModule → BuildCatalog → SignCatalog**.

## Certificate Sources

PowerShellBuild supports four ways to supply a certificate, listed here in order of common use:

**1. Automatic (CI/CD) — Base64 PFX in an env var**

```powershell
# Store your PFX as a base64 secret (e.g. GitHub Actions secret SIGNCERTIFICATE)
# PowerShellBuild picks it up automatically when Sign.Enabled = $true
$PSBPreference.Sign.Enabled = $true
# CertificateSource defaults to 'Auto' — done
```

**2. Local dev — certificate store**

```powershell
$PSBPreference.Sign.Enabled           = $true
$PSBPreference.Sign.CertificateSource = 'Store'
# picks first valid, unexpired code-signing cert in Cert:\CurrentUser\My

# Or pin to a specific one by thumbprint:
$PSBPreference.Sign.CertificateSource = 'Thumbprint'
$PSBPreference.Sign.Thumbprint        = 'AB12CD34EF...'
```

**3. PFX file on disk**

```powershell
$PSBPreference.Sign.Enabled           = $true
$PSBPreference.Sign.CertificateSource = 'PfxFile'
$PSBPreference.Sign.PfxFilePath       = './codesign.pfx'
$PSBPreference.Sign.PfxFilePassword   = (Read-Host -AsSecureString 'Password')
```

**4. Pre-resolved object (Azure Key Vault, HSM, etc.)**

```powershell
# Get the cert however you like, then hand it directly:
$cert = Get-AzKeyVaultCertificate -VaultName 'MyVault' -Name 'CodeSignCert' |
    Get-AzKeyVaultSecret | ... # your Key Vault retrieval logic

$PSBPreference.Sign.Enabled     = $true
$PSBPreference.Sign.Certificate = $cert   # bypasses CertificateSource entirely
```

All of these go in your `Properties {}` block (psake) or before dot-sourcing (Invoke-Build), before the task file is loaded. To also sign before publishing:

```powershell
$PSBPublishDependency = @('Sign')
```

All signing operations include platform checks (Windows-only) with appropriate warnings, and verbose logging throughout makes troubleshooting straightforward.

## Get Started

- **Read the docs:** Check out the [PowerShellBuild documentation](/docs/powershellbuild/introduction) for a complete walkthrough
- **Upgrade:** `Install-Module PowerShellBuild -RequiredVersion 0.8.0`
- **Release notes:** [v0.8.0 on GitHub](https://github.com/psake/PowerShellBuild/releases/tag/v0.8.0)
- **Feedback:** Open an issue on [GitHub](https://github.com/psake/PowerShellBuild/issues) — we'd love to hear how you're using the signing tasks
