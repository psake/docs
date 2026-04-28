#requires -Version 7
Version 5

$ErrorView = 'Detailed'

Properties {
  $script:psakeVersion = (Get-Module psake).Version
  $script:PowerShellBuildVersion = (Get-Module PowerShellBuild).Version

  # -----------------------------------------------------------------------------
  # Use below settings to manipulate the rendered MDX files
  # -----------------------------------------------------------------------------

  $script:docusaurusOptions = @{
    Module = 'Psake'
    DocsFolder = './docs'
    SideBar = 'commands'
    EditUrl = 'null' # prevent the `Edit this Page` button from appearing
    Exclude = @()
    MetaDescription = 'Help page for the PowerShell Psake "%1" command'
    MetaKeywords = @('PowerShell', 'Psake', 'Help', 'Documentation')
    PrependMarkdown = @"
:::info This page was generated
Contributions are welcome in [Psake-repo](https://github.com/psake/psake).
:::
"@
    AppendMarkdown = @"
## VERSION
*This page was generated using comment-based help in [Psake $($psakeVersion)](https://github.com/psake/psake).*
"@
    HelpVersion = "$($script:psakeVersion)"
    CommandVersionMap = @{
      'BuildSetup' = '5.0'
      'BuildTearDown' = '5.0'
      'Clear-PsakeCache' = '5.0'
      'Execute' = '5.0'
      'Get-PsakeBuildPlan' = '5.0'
      'Test-BuildEnvironment' = '5.0'
      'Test-PsakeTask' = '5.0'
      'Version' = '5.0'
    }
  }
  $script:docsOutputFolder = Join-Path $docusaurusOptions.DocsFolder $docusaurusOptions.Sidebar | Join-Path -ChildPath '*.*'

  # -----------------------------------------------------------------------------
  # PowerShellBuild command reference options
  # -----------------------------------------------------------------------------

  $script:psbVersion = (Get-Module PowerShellBuild -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1).Version
  $script:psbOptions = @{
    Module = 'PowerShellBuild'
    DocsFolder = './docs'
    SideBar = 'psb-commands'
    EditUrl = 'null'
    Exclude = @()
    MetaDescription = 'Help page for the PowerShellBuild "%1" command'
    MetaKeywords = @('PowerShell', 'PowerShellBuild', 'Help', 'Documentation')
    PrependMarkdown = @"
:::info This page was generated
Contributions are welcome in [PowerShellBuild-repo](https://github.com/psake/PowerShellBuild).
:::
"@
    AppendMarkdown = @"
## VERSION
*This page was generated using comment-based help in [PowerShellBuild $($psbVersion)](https://github.com/psake/PowerShellBuild).*
"@
    HelpVersion = "$($script:psbVersion)"
  }
  $script:psbOutputFolder = Join-Path $psbOptions.DocsFolder $psbOptions.Sidebar | Join-Path -ChildPath '*.*'
}

FormatTaskName {
  param($taskName)
  Write-Host 'Task: ' -ForegroundColor Cyan -NoNewline
  Write-Host $taskName.ToUpper() -ForegroundColor Blue
}

Task Default -Depends Build

Task 'Init' @{
  Description = 'Install Node.js dependencies.'
  Inputs = @('package.json', 'bun.lock')
  Outputs = 'node_modules'
  Action = { Exec { bun install } }
}

Task 'Build' @{
  Description = 'Full production site build.'
  DependsOn = @('Init', 'GenerateCommandReference', 'GenerateCommandReferencePSB', 'FrontMatterCMSSync')
  Action = { Exec { bun run build } }
}

Task 'Server' @{
  Description = 'Serve the production build locally.'
  DependsOn = 'Build'
  Action = { Exec { bun run serve } }
}

Task 'Test' @{
  Description = 'Run Pester tests to validate sidebar links.'
  Action = {
    Import-Module Pester -MinimumVersion '5.0' -Force
    $configuration = New-PesterConfiguration
    $configuration.Output.Verbosity = 'Detailed'
    $configuration.Run.PassThru = $true
    $configuration.Run.Path = "$PSScriptRoot\tests"

    $testResult = Invoke-Pester -Configuration $configuration -Verbose

    if ($testResult.FailedCount -gt 0) {
      throw 'One or more Pester tests failed'
    }
  }
}

(Get-Content '.\package.json' | ConvertFrom-Json -AsHashtable).scripts.Keys | ForEach-Object {
  Task "bun_$($_)" @{
    Action = [scriptblock]::Create("exec { bun run $($_) }")
    DependsOn = @('Init')
    Description = 'Automatic: A script defined in your package.json'
  }
}

#region Command Reference Generation Tasks
Task 'GenerateCommandReference' @{
  Description = 'Use Microsoft.PowerShell.PlatyPS to generate command reference docs.'
  DependsOn = 'GenerateCommandReference-Gen'
}

Task 'GenerateCommandReference-Clean' @{
  Action = {
    Write-Host 'Removing existing MDX files' -ForegroundColor Magenta
    if (Test-Path -Path $script:docsOutputFolder) {
      Remove-Item -Path $script:docsOutputFolder
    }
  }
}

Task 'GenerateCommandReference-Gen' @{
  DependsOn = 'GenerateCommandReference-Clean'
  Action = {
    Write-Host 'Generating new MDX files using Microsoft.PowerShell.PlatyPS' -ForegroundColor Magenta
    . "$PSScriptRoot\scripts\New-DocusaurusModuleHelp.ps1"
    Import-Module Microsoft.PowerShell.PlatyPS -Force
    New-DocusaurusModuleHelp @script:docusaurusOptions
  }
}
#endregion Command Reference Generation Tasks

#region PSB Command Reference Generation Tasks
Task 'GenerateCommandReferencePSB' @{
  Description = 'Use Microsoft.PowerShell.PlatyPS to generate PowerShellBuild command reference docs.'
  DependsOn = 'GenerateCommandReferencePSB-Gen'
  PreCondition = { $null -ne (Get-Module PowerShellBuild -ListAvailable | Select-Object -First 1) }
}

Task 'GenerateCommandReferencePSB-Clean' @{
  Action = {
    Write-Host 'Removing existing PSB MDX files' -ForegroundColor Magenta
    if (Test-Path -Path $script:psbOutputFolder) {
      Remove-Item -Path $script:psbOutputFolder
    }
  }
}

Task 'GenerateCommandReferencePSB-Gen' @{
  DependsOn = 'GenerateCommandReferencePSB-Clean'
  Action = {
    Write-Host 'Generating new PSB MDX files using Microsoft.PowerShell.PlatyPS' -ForegroundColor Magenta
    New-Item -ItemType Directory -Path (Join-Path $psbOptions.DocsFolder $psbOptions.SideBar) -Force | Out-Null
    . "$PSScriptRoot\scripts\New-DocusaurusModuleHelp.ps1"
    Import-Module Microsoft.PowerShell.PlatyPS -Force
    Import-Module PowerShellBuild -Force
    New-DocusaurusModuleHelp @script:psbOptions
  }
}
#endregion PSB Command Reference Generation Tasks

#region Sync Front Matter Data
Task 'FrontMatterCMSSync' @{
  Description = 'Sync Docusaurus YAML data to FrontMatter CMS-friendly choices.jsonc files.'
  Inputs = @('blog/authors.yml', 'blog/tags.yml')
  Outputs = @('authors.choices.jsonc', 'tags.choices.jsonc')
  Action = {
    @('blog/authors.yml', 'blog/tags.yml') | ForEach-Object {
      if (-not (Test-Path $_)) {
        Write-Warning "File not found: $_"
        return
      }
      $outputFile = Join-Path $PSScriptRoot (($_ -replace 'blog/', '') -replace '\.yml$', '.choices.jsonc')

      [array]$output = @(@{ '_comment' = "This file is auto-generated from $_ via a psake task" })
      $yaml = Get-Content -Raw $_ | ConvertFrom-Yaml
      foreach ($item in $yaml.Keys) {
        $value = $yaml[$item]
        if (-not $value.Contains('handle')) { $value.Add('handle', $item) }
        $output += $value
      }
      Set-Content -Path $outputFile -Force -Value ($output | ConvertTo-Json -Depth 10)
    }
  }
}
#endregion Sync Front Matter Data
