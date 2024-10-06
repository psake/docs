#require -Version 7
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
  }
  $script:docsOutputFolder = Join-Path -Path $docusaurusOptions.DocsFolder -ChildPath $docusaurusOptions.Sidebar | Join-Path -ChildPath "*.*"
}

FormatTaskName {
  param($taskName)
  Write-Host 'Task: ' -ForegroundColor Cyan -NoNewline
  Write-Host $taskName.ToUpper() -ForegroundColor Blue
}

Task Default -depends Build

Task Init -description "Initial action to setup the further action." -action {
  yarn install
}

Task Build -depends Init, GenerateCommandReference {
  yarn run build
  if ($LastExitCode -ne 0) {
    throw "NPM Build failed"
  }
}

Task Server -depends Build -description "Run the docusaurus server." {
  yarn run serve
}

Task Test {
  $configuration = [PesterConfiguration]::Default
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

(Get-Content ".\package.json" | ConvertFrom-Json -AsHashtable).scripts.Keys | ForEach-Object {
  $action = [scriptblock]::create("yarn run $($_)")
  $taskSplat = @{
    name = "yarn_$($_)"
    action = $action
    depends = @('Init')
    description = "Automatic: A script defined in your package.json"
  }
  Task @taskSplat
}

#region Command Reference Generation Tasks
# Copied from the amazing Pester team! https://github.com/pester/docs/blob/main/generate-command-reference.ps1
$taskSplat = @{
  description = "Use Alt3.Docusaurus.Powershell module to generate our reference docs."
  depends = 'GenerateCommandReference-Gen'
}
Task -name 'GenerateCommandReference' @taskSplat

Task -name 'GenerateCommandReference-Clean' -action {
  Write-Host "Removing existing MDX files" -ForegroundColor Magenta
  if (Test-Path -Path $script:docsOutputFolder) {
    Remove-Item -Path $script:docsOutputFolder
  }
}

Task -name "GenerateCommandReference-Gen" -depends 'GenerateCommandReference-Clean' {
  Write-Host "Generating new MDX files" -ForegroundColor Magenta
  New-DocusaurusHelp @docusaurusOptions

  # Fix the links
  Get-ChildItem $script:docsOutputFolder | ForEach-Object {
    $path = $_.FullName
    Write-Host "Fixing relative links for: $path"
    Get-Content $path | ForEach-Object {
      $_ -replace "\[(.+)\]\(\)", '[$1]($1.mdx)'
    } | Set-Content $path
  }
}
#region Command Reference Generation Tasks
