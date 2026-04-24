@{
  PSDependOptions = @{
    Target = 'CurrentUser'
  }
  'Pester' = @{
    Version = '5.7.1'
    Parameters = @{
      SkipPublisherCheck = $true
    }
  }
  'psake' = @{
    Version = '5.0.3'
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
