Describe "Documentation" {
  Context "Sidebar" {
    BeforeDiscovery {
      $docsDir = Resolve-Path "$PSScriptRoot\..\docs" -Relative
      $script:docs = Get-ChildItem -Recurse $docsDir -File -Filter "*.md*" | Where-Object {
        # Exclude commands dir since that's added via an import
        $_.DirectoryName -notlike '*commands'
      }
      $script:sidebar = Resolve-Path "$PSScriptRoot\..\sidebars.ts"
    }
    # This confirms that all our docs are linked in the sidebar.ts file
    It "<_> is linked in the sidebar" -ForEach $script:docs {
      $dirName = Split-Path -Path $_.DirectoryName -Leaf
      if ($dirName -eq "docs") {
        # Root dir isn't needed
        $ts_format = $_.BaseName
      } else {
        $ts_format = "{0}/{1}" -f $dirName, $_.BaseName
      }
      $sidebar | Should -FileContentMatch $ts_format
    }
  }
}
