---
title: Tasks
description: "Learn how to use the most important building block in psake: The Task"
---

At the core of psake is the task. In it's simplest form you have a task with a
name and an action.

```powershell
task Hello {
  "Hello world"
}
```

This is the equivalent:

```powershell
Task -Name "Hello" -Action {
  "Hello world"
}
```

## Dependencies

The power of psake is in it's ability to support dependencies. You can add
`-Depends` to your task and give it a list of other tasks that need to run
before it does.

```powershell
Task PBJ -Depends Toast, PB, Jelly {
  "Enjoy sandwich!"
}
Task Toast {
  "Toast 2 pieces of bread"
}
Task PB {
  "Spread some peanut butter"
}
Task Jelly {
  "Spread some jelly"
}
```

## Conditional Tasks

You can conditionally run a task by using the "precondition" parameter of the
"task" function. The "precondition" parameter expects a scriptblock as its value
and that scriptblock should return a $true or $false.

The following is an example build script that uses the "precondition" parameter
of the task function:

```powershell
task default -depends A,B,C

task A {
  "TaskA"
}

task B -precondition { return $false } {
  "TaskB"
}

task C -precondition { return $true } {
  "TaskC"
}
```

The output from running the above build script looks like the following:

```powershell
Executing task: A
TaskA
Precondition was false not executing B
Executing task: C
TaskC

Build Succeeded!

----------------------------------------------------------------------
Build Time Report
----------------------------------------------------------------------
Name   Duration
----   --------
A      00:00:00.0231283
B      0
C      00:00:00.0043444
Total: 00:00:00.1405840
```

Notice how task "B" was not executed and its run-time duration was 0 secs.
