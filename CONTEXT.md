# psake Documentation

Terminology used to explain psake build definitions and reusable task distribution.

## Language

**Shared task module**:
A PowerShell module that distributes reusable psake task definitions through a module-root `psakeFile.ps1`.
_Avoid_: Shared module, build module, task library

**Provider module**:
The shared task module that owns and distributes reusable task definitions.
_Avoid_: Source module, plugin

**Consumer build**:
A psake build that references tasks from a provider module using `Task -FromModule`.
_Avoid_: Client build, importing build

**Shared task reference**:
A declaration in a consumer build that selects a provider task using `Task -FromModule`; it references a provider definition rather than defining a local task action.
_Avoid_: Imported task, module task import

**Public task**:
A provider task intended for consumers to reference directly. Public status is an authoring convention because psake registers every task in the provider task file without visibility boundaries.
_Avoid_: Exported task

**Supporting task**:
A provider task that exists primarily as a dependency of a public task. It remains directly invocable because psake does not enforce task visibility.
_Avoid_: Private task, internal task
