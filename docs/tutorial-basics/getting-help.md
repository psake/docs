---
description: Learn how to get help on your psake tasks
sidebar_position: 3
---

# Getting Help

You can also use the PowerShell command `Get-Help` on the `Invoke-psake`
function to get more detailed help.

```powershell
# First import the psake.psm1 file

Import-Module .\psake.psm1

Get-Help Invoke-psake -full
```

To list functions available in the psake module:

```powershell
C:\Software\psake> Get-Command -module psake

CommandType     Name                                                          Definition
-----------     ----                                                          ----------
Function        Assert                                                        ...
Function        Exec                                                          ...
Function        FormatTaskName                                                ...
Function        Include                                                       ...
Function        Invoke-psake                                                  ...
Function        Properties                                                    ...
Function        Task                                                          ...
Function        TaskSetup                                                     ...
Function        TaskTearDown                                                  ...
```

To get example usage for individual functions in the psake PowerShell module,
use Get-Help, For example:

```powershell
C:\Software\psake> Get-Help Assert -examples

NAME
    Assert

SYNOPSIS
    Helper function for "Design by Contract" assertion checking.

    -------------------------- EXAMPLE 1 --------------------------

    C:\PS>Assert $false "This always throws an exception"


    This example always throws an exception




    -------------------------- EXAMPLE 2 --------------------------

    C:\PS>Assert ( ($i % 2) -eq 0 ) "%i is not an even number"


    This example may throw an exception if $i is not an even number
```
