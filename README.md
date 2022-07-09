# nodeCommandLine
*by TwilCynder* 

nodeCommandLine is a node module designed to allow devs to control a Nodejs server in real time via the terminal.  
It simply allows your node application to read unix-style input on the terminal it has been launched from, and only requires you to directly define functions to call when a specific "command" is read.

```
node myServer.js 80 
> 
```

Just to avoid confusion : unlike most other modules in the "CLI" category, which interact with the arguments you pass to your program when launchig it, this module allows you to make your program a command interpreter on it's own, interpreting commands written in the terminal **while it runs**, in parallel to other tasks (such as running a web server for example)

## Commands
All "commands" are basically functions. By default (i.e. before you start using [namespaces](#namespaces), which you should still only do after reading this part), all commands are stored in a single table : `commandLine.commands`.  
Every method of this object is a command, its key/name being the name of the command.

Note that to add commands to the hash, you can just define them like with any other method (`commandLine.commands.my_command = ()=>{}))`, or you can also redefine the `commandLine.commands` property : instead of actually redefining it, if the new value is an object, every method of this new object will be added as commands. 
```javascript
var cl = require("@twilcynder/commandline");
...
cl.commands = {
    command1: function(){
        ...
    },
    command2 function(){
        ...
    }
}
```
The code above will simply add command1 and command2 to the command list and keep all previous commands.

## The terminal
To actually use the terminal, you first need to call `commandLine.start()`.
A prompt will be displayed, and you can start typing commands. Commands are read unix-style : the first word (words being separated by simple spaces) is the command name, and all subsequent words are the arguments. CL will simply try to find a command with the right name (commandLine.commands[name]) and call it with an array containing all other words in the input line as its single argument (this argument in kind of like `argv` in C, except the command name is not included. There is no argc, since it's very easy to acess the length of an array in JavaScript. However, if the command function has the property noArgsParse set to true, CL will not pass an array of word to it, just the arguments string as-is.

*example : *
Typing `command1 word1 word2` will result in the following call :  
`commandLine.commands["command1"](["word1", "word2"]);`. 
If there is no command named "command1" (i.e. `typeof commandLine.commands["command1"] != "function"`), an error will be displayed by default.

After your command has finished executing, the prompt will be displayed again.

### The prompt
The prompt is by default `>`, but can be changed by modifying the commandLine.prompt property. If the value of commandLine.prompt is a string, it will be printed as-is, and if it's a function it will be called and its return value considered as the prompt.

## Namespaces
Namespaces are basically named groups of commands. This allows you to have multiple commands with the same name, which is very likely to happen if your application is composed of multiple modules that add commands. In that situation, the different modules can each create a namespace, removing the risk of command overwrite. 

A namespace is created with `commandLine.addNamespace(name)`, name being the name of the namespace. This returns a Namespace object, which exposes a `commands` properties, working just like `commandsLine.commands` : any method you add to this object will be treaded as a command in the namespace, and you can redefine it with a object containing commands to add :  
```javascript
commandLine.addNamespace("MyNamespace").commands = {
    command1: function(){
        ...
    },
    command2 function(){
        ...
    }
}
```

A command within a namespace is called from the terminal by typing `namespaceName:commandName arguments...`, or, if the "defaultToNamespace" [config option](#configuration) is set to true, `namespaceName commandName arguments...`, if namespaceName is not already the name of a command in the [default namespace](#the-default-namespace).

commandLine.getNamespace(name) can be used to retrieve a previously defined namespace.

### The default namespace
There is always a default namespace; it is the one you interact when using the basic `commandLine.commands` property as [described earlier](#commands), and by extension, where commands are looked for when no namespace is specified (note: as explained earlier, if the "defaultToNamespace" [config option](#configuration) is set to true, what happens when you type a command name without a namespace (i.e. without a `:`) is that commandLine first looks for this name in the default namespace, then interprets it as a namespace if it didn't find a command).

You can set which namespace is the default one with `commandLine.setDefaultNamespace(name)`; the name of the original default name is "default".
```js
var cl = require("@twilcynder/commandline");
cl.addNamespace("Test");
/*Adding commands to this namespace as well as the default namespace with cl.commands*/
cl.setDefaultNamespace("Test"); //the default namespace is now Test, you can type the name of a command defined in this namespace without specifying it, and you need to type default:commandName to use a command that was defined in the origin default namespace.
cl.setDefaultNamespace("default"); //restoring the original default namespace.
```

### Main module
CL provides a way for your modules to know if they can use the default namespace, of should create their own. Calling `commandLine.takeMainModule()` will try to claim the role of "main module" (i.e. the one that should use the default namespace), returning true if and only if no one has called this function before.  
Basically, the idea is that everyone should calls this function and use the default namespace is it returned true, creating namespace if not.

> That way, if you have your app's module, and an imported module that would also like to use the default namespace (simply to avoid having to type a namespace name in the terminal if it can be avoided), they can both call this function ; if you want the default namespace to be used by your app's module, you call `commandLine.takeMainModule()` *before requiring the second module*. When doing the same, the second module will know that your app already uses the default namespace and can use a new namespace instead.   

## Configuration 
CommandLine can be configured through the `commandLine.config` object, by changing its properties. You can also use `commandLine.config = {...}`, which will replace only the properties contained in the object you give. 

The properties are : 
- defaultToNamespace : if true, typing the name of a default-namespace command that doesn't exist will result in commandline interpreting it as a namespace (and the second word of the line as a command to find in this namespace)
- noArgsParse : if set to true, instead of passing an array of the words passed as arguments to your command function, commandLine will instead just pass the unparsed arguments string (i.e. the command line without the name of the command).

## Logging
Due to it heavily relying on the terminal, nodeCommandLine can badly interact with your logs. Specifically, if you are not careful you'll see a lot of prompts followed by a log from a completely unrealted part of your code, and the actual typing zone left without a prompt (which is not a real problem since the prompt is here only for informative or even simply aesthetic purpose).
To avoid these problems, you simply need to call commandLine.startLogging() before using console.log() from a part of the code that's unrelated to commands (typically, an event call, or callback), and commandLine.stopLogging() after you've finished logging and you server goes back to a waiting state. 
*note : since version 1.0.3, commandLine.startLogging() will be automatically called if you use console.log().

This module also defines `print`, an alias for `process.stdout.write`.

## Error handling
If you try to call a missing command, CL will print an error message by default. You can change this behavior by defining a `commandLine.onMissingCommand()` method, that will be called when it happens.