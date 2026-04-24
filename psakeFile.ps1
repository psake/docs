#require -Version 7
Version 5

$ErrorView = 'Detailed'

Properties {
  $script:OutputPath = $null
  $script:OutputFormat = 'Nunit'
  $script:psakeVersion = (Get-Module psake).Version

  # -----------------------------------------------------------------------------
  # Use below settings to manipulate the rendered MDX files
  # -----------------------------------------------------------------------------

  $script:docusaurusOptions = @{
    Module = "Psake"
    DocsFolder = "./docs"
    SideBar = "commands"
    EditUrl = "null" # prevent the `Edit this Page` button from appearing
    Exclude = @()
    MetaDescription = 'Help page for the PowerShell Psake "%1" command'
    MetaKeywords = @(
      "PowerShell"
      "Psake"
      "Help"
      "Documentation"
    )
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
  }
  $script:docsOutputFolder = Join-Path -Path $docusaurusOptions.DocsFolder -ChildPath $docusaurusOptions.Sidebar | Join-Path -ChildPath "*.*"
}

FormatTaskName {
  param($taskName)
  Write-Host 'Task: ' -ForegroundColor Cyan -NoNewline
  Write-Host $taskName.ToUpper() -ForegroundColor Blue
}

Task Default -Depends Build

Task 'Init' @{
  Description = 'Install Node.js dependencies.'
  Inputs      = @('package.json', 'bun.lock')
  Outputs     = 'node_modules/.cache'
  Action      = { exec { bun install } }
}

Task 'Build' @{
  Description = 'Full production site build.'
  DependsOn   = @('Init', 'GenerateCommandReference', 'FrontMatterCMSSync')
  Action      = { exec { bun run build } }
}

Task 'Server' @{
  Description = 'Serve the production build locally.'
  DependsOn   = 'Build'
  Action      = { exec { bun run serve } }
}

Task 'Test' @{
  Description = 'Run Pester tests to validate sidebar links.'
  Action      = {
    Import-Module Pester -MinimumVersion '5.0' -Force
    $configuration = New-PesterConfiguration
    $configuration.Output.Verbosity = 'Detailed'
    $configuration.Run.PassThru = $true
    $configuration.Run.Path = "$PSScriptRoot\tests"

    try {
      $testResult = Invoke-Pester -Configuration $configuration -Verbose
    } finally {
    }

    if ($testResult.FailedCount -gt 0) {
      throw 'One or more Pester tests failed'
    }
  }
}

(Get-Content ".\package.json" | ConvertFrom-Json -AsHashtable).scripts.Keys | ForEach-Object {
  $action = [scriptblock]::create("exec { bun run $($_) }")
  $taskSplat = @{
    name = "bun_$($_)"
    action = $action
    depends = @('Init')
    description = "Automatic: A script defined in your package.json"
  }
  Task @taskSplat
}

#region Command Reference Generation Tasks
$taskSplat = @{
  description = "Use Microsoft.PowerShell.PlatyPS to generate command reference docs."
  depends = 'GenerateCommandReference-Gen'
}
Task -Name 'GenerateCommandReference' @taskSplat

Task -Name 'GenerateCommandReference-Clean' -Action {
  Write-Host "Removing existing MDX files" -ForegroundColor Magenta
  if (Test-Path -Path $script:docsOutputFolder) {
    Remove-Item -Path $script:docsOutputFolder
  }
}

Task -Name "GenerateCommandReference-Gen" -Depends 'GenerateCommandReference-Clean' {
  Write-Host "Generating new MDX files using Microsoft.PowerShell.PlatyPS" -ForegroundColor Magenta
  . "$PSScriptRoot\scripts\New-PsakeDocusaurusHelp.ps1"
  Import-Module Microsoft.PowerShell.PlatyPS -Force
  New-PsakeDocusaurusHelp @docusaurusOptions
}
#endregion Command Reference Generation Tasks

#region Sync Front Matter Data
Task -Name 'FrontMatterCMSSync' {
  (
    'blog/authors.yml',
    'blog/tags.yml'
  ) | ForEach-Object {
    if (-not (Test-Path $_)) {
      Write-Warning "File not found: $_"
      return
    }
    $name = $_ -replace '\.yml$', '.choices.jsonc'
    $outputFile = Join-Path -Path $PSScriptRoot -ChildPath (Split-Path -Path $name -Leaf)

    [array]$output = @(
      @{
        "_comment" = "This file is auto-generated from $_ via a psake task"
      }
    )
    $yaml = Get-Content -Raw $_ | ConvertFrom-Yaml
    foreach ($item in $yaml.Keys) {
      $value = $yaml[$item]
      if (-not $value.Contains('handle')) {
        $value.Add('handle', $item)
      }
      $output += $value
    }
    Set-Content -Path $outputFile -Force -Value ($output | ConvertTo-Json -Depth 10)
  }
  # TODO: Add support to sync back from FrontMatter CMS to authors.json and tags.json
} -Description "Syncs Docusaurus JSON data from authors.json and tags.json to FrontMatter CMS friendly choices.json files."
#endregion Sync Front Matter Data
