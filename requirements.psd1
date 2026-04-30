@{
  PSDependOptions = @{
    Target = 'CurrentUser'
  }
  'Pester' = @{
    Version = '5.7.1'
    Parameters = @{
      SkipPublisherCheck = $true
    }
    Import = $false
  }
  'psake' = @{
    Version = 'latest'
  }
  'Microsoft.PowerShell.PlatyPS' = @{
    Version = 'latest'
  }
  'PowerShellBuild' = @{
    Version = 'latest'
  }
  'Yayaml' = @{
    Version = '0.6.0'
  }
}
