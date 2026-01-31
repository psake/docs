# Logging Errors

By default, psake does not log errors to a file. When an error occurs, detailed error information is emitted to the console. Most CI servers capture all console output, so this is usually sufficient.

If you need to route errors to a file or custom logger, you can override psake's error output handler. See [Custom Logging](./custom-logging.md) for details.

Here is an example of the default error output from a psake build script:

```powershell
----------------------------------------------------------------------
4/25/2010 2:36:21 PM: An Error Occurred. See Error Details Below: 
----------------------------------------------------------------------
ErrorRecord
PSMessageDetails      : 
Exception             : System.Management.Automation.RuntimeException: This is a test
TargetObject          : This is a test
CategoryInfo          : OperationStopped: (This is a test:String) [], RuntimeException
FullyQualifiedErrorId : This is a test
ErrorDetails          : 
InvocationInfo        : System.Management.Automation.InvocationInfo
PipelineIterationInfo : {}

ErrorRecord.InvocationInfo
MyCommand        : 
BoundParameters  : {}
UnboundArguments : {}
ScriptLineNumber : 4
OffsetInLine     : 7
HistoryId        : 34
ScriptName       : C:\Users\Daddy\Documents\Projects\helloWorld\Build\LogError.ps1
Line             :     throw "This is a test"
PositionMessage  : 
                   At C:\Users\Daddy\Documents\Projects\helloWorld\Build\LogError.ps1:4 char:7
                   +     throw <<<<  "This is a test"
InvocationName   : throw
PipelineLength   : 0
PipelinePosition : 0
ExpectingInput   : False
CommandOrigin    : Internal

Exception
0000000000000000000000000000000000000000000000000000000000000000000000
ErrorRecord                 : This is a test
StackTrace                  : 
WasThrownFromThrowStatement : True
Message                     : This is a test
Data                        : {}
InnerException              : 
TargetSite                  : 
HelpLink                    : 
Source                      : 

----------------------------------------------------------------------
Script Variables
----------------------------------------------------------------------

Name                           Value                                                                                                         
----                           -----                                                                                                         
_                                                                                                                                            
args                           {}                                                                                                            
context                        {System.Collections.Hashtable}                                                                                
Error                          {}                                                                                                            
false                          False                                                                                                         
input                          System.Collections.ArrayList+ArrayListEnumeratorSimple                                                        
MaximumAliasCount              4096                                                                                                          
MaximumDriveCount              4096                                                                                                          
MaximumErrorCount              256                                                                                                           
MaximumFunctionCount           4096                                                                                                          
MaximumVariableCount           4096                                                                                                          
MyInvocation                   System.Management.Automation.InvocationInfo                                                                   
null                                                                                                                                         
psake                          {build_script_file, version, default_build_file_name, use_exit_on_error...}                                   
this                                                                                                                                         
true                           True              
```
