---
title: Parameters & Properties
description: "How to use parameters and properties in your build script."
sidebar_position: 11
---

To summarize the differences between passing parameters and properties to the
`Invoke-psake` function:

* Parameters and "properties" can both be passed to the Invoke-psake function
  simultaneously
* Parameters are set before any "properties" blocks are run
* Properties are set after all "properties" blocks have run

## Parameters

You can pass parameters to your build script using the "parameters" parameter of
the Invoke-psake function. The following is an example:

```powershell
Invoke-psake .\parameters.ps1 -parameters @{"p1"="v1";"p2"="v2"}
```

The example above runs the build script called `parameters.ps1` and passes in
parameters `p1` and `p2` with values `v1` and `v2`. The parameter value for the
"parameters" parameter (say that 10 times really fast!) is a PowerShell
hashtable where the name and value of each parameter is specified.

:::note

You don't need to use the "$" character when specifying the parameter names in
the hashtable.

:::

```powershell title="parameters.ps1"
properties {
  $my_property = $p1 + $p2
}

task default -depends TestParams

task TestParams {
  Assert ($my_property -ne $null) '$my_property should not be null'
}
```

The Assert in this example would pass because when it runs, `$my_property`
would be set to `v1v2` and not be `$null`.

## Properties

You can override a property in your build script using the `properties`
parameter of the Invoke-psake function. The following is an example:

```powershell
Invoke-psake .\properties.ps1 -properties @{"x"="1";"y"="2"}
```

The example above runs the build script called `properties.ps1` and passes in
parameters `x` and `y` with values `1` and `2`. The parameter value for the
"properties" parameter is a PowerShell hashtable where the name and value of
each property is specified.

:::note

You don't need to use the "$" character when specifying the property names in
the hashtable.

:::

```powershell title="properties.ps1"
properties {
 $x = $null
 $y = $null
 $z = $null
}

task default -depends TestProperties

task TestProperties {
  Assert ($x -ne $null) "x should not be null"
  Assert ($y -ne $null) "y should not be null"
  Assert ($z -eq $null) "z should be null"
}
```

The value of `$x` should be `1` and `$y` should be `2` by the time the
`TestProperties` task is executed. The value of `$z` was not overridden so it
should still be `$null`.
