# nodeCommandLine
*by TwilCynder* 

nodeCommandLine is a node module designed to allow devs to control a Nodejs server in real time via the terminal.  
It simply allows your node application to read unix-style input on the terminal it has been launched from, and only requires you to directly define functions to call when a specific "command" is read.

##The command object
All "commands" are basically functions, stored in a single hash : `commandLine.commands`, which acts a little bit like a `/bin` folder.
Every method of this object is a command, it's name being the name of the command.

Note that to add commands to the hash, you can just define them like with any other method (`commandLine.commands.my_command = function(){}), or you can redefine the `commandLinecommands` property : instead of actually redefining it, if the new value is an object, every method of this new object will be added as commands. 
```javascript
var cl = require("@twilcynder/commandline);
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

##The terminal
To actually use the terminal, you first need to call `commandLine.start()`.
A prompt will be displayed, and you can start typing commands. Commands are read unix-style : the first word (words being separated by simple spaces) is the command name, and all subsequent words are the arguments. CL will simply try to find a command with the right name (commandLine.commands[name]) and call it with an array containing all other words in the input line as its single argument (this argument in kinda like `argv` in C, except the command name is not included. There is no argc, since it's very easy to acess the length of an array in JavaScript.

*example : *
Typing `command1 word1 word2` will result in the following call :  
`commandLine.commands["command1"](["word1", "word2"]);`. 
If there is no command named "command1" (i.e. `typeof commandLine.commands["command1"] != "function"`), an error will be displayed by default.

After your command has finished executing, the prompt will be displayed again.

####The prompt
The prompt is by default `>`, but can be changed by modifying the commandLine.prompt property. If the value of commandLine.prompt is a string, it will be taken as-is, and if it's a function it will be called and its return value considered as the prompt.

##Logging
Due to it heavily relying on the terminal, nodeCommandLine can badly interact with your logs. Specifically, if you are not careful you'll see a lot of prompts followed by a log from a completely unrealted part of your code, and the actual typing zone left without a prompt (which is not a real problem since the prompt is here only for informative or even simply aesthetic purpose).
To avoid these problems, you simply need to call commandLine.startLogging() before using console.log() from a part of the code that's unrelated to commands (typically, an event call, or callback), and commandLine.stopLogging() after you've finished logging and you server goes back to a waiting state. 
*note : since version 1.0.3, commandLine.startLogging() will be automatically called if you use console.log().

This module also defines `print`, an alias for `process.stdout.write`.

##Error handling
If you try to call a missing command, CL will print an error message by default. You can change this behavior by defining a `commandLine.onMissingCommand()` method, that will be called when it happens.