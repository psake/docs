@{
  PSDependOptions = @{
    Target = 'CurrentUser'
  }
  'Pester' = @{
    Version = '5.6.1'
    Parameters = @{
      SkipPublisherCheck = $true
    }
  }
  'psake' = @{
    Version = '4.9.0'
  }
  'PlatyPS' = @{
    Version = '0.14.2'
  }
  'Alt3.Docusaurus.Powershell' = @{
    Version = '1.0.36'
  }
}