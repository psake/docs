Properties {
}

Task Default -depends Build

Task Init {
  yarn install
}

Task Build -depends Init, GenerateCommandReference {
  yarn run build
  if ($LastExitCode -ne 0) {
    throw "NPM Build failed"
  }
}

Task Server -depends Build {
  yarn run serve
}

# TODO: Come up with a way to gen tasks from package scripts...
Task GenerateCommandReference {
  # Copied from the amazing Pester team! https://github.com/pester/docs/blob/main/generate-command-reference.ps1
  # -----------------------------------------------------------------------------
  # Use below settings to manipulate the rendered MDX files
  # -----------------------------------------------------------------------------
  $psakeVersion = (Get-Module psake).Version
  $docusaurusOptions = @{
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

  # -----------------------------------------------------------------------------
  # Generate the new MDX files
  # -----------------------------------------------------------------------------
  Push-Location $PSScriptRoot
  Write-Host (Get-Location)

  Write-Host "Removing existing MDX files" -ForegroundColor Magenta
  $outputFolder = Join-Path -Path $docusaurusOptions.DocsFolder -ChildPath $docusaurusOptions.Sidebar | Join-Path -ChildPath "*.*"
  if (Test-Path -Path $outputFolder) {
    Remove-Item -Path $outputFolder
  }

  Write-Host "Generating new MDX files" -ForegroundColor Magenta
  New-DocusaurusHelp @docusaurusOptions
  
  # Fix the links
  Get-ChildItem $outputFolder | ForEach-Object {
    $path = $_.FullName
    Write-Host "Fixing relative links for: $path"
    Get-Content $path | ForEach-Object {
      $_ -replace "\[(.+)\]\(\)", '[$1]($1.mdx)'
    } | Set-Content $path
  }

  Write-Host "Render completed successfully" -BackgroundColor DarkGreen
  Pop-Location
}