var readline = require('readline');

//TODO : autocompletion, actual doc (generate doc + multiple md files), 
//description system (basically, make the commands more complex, like the commandline package)

var statusCodes = {
    OK: 0,
    NOCOMMAND : 1,
    NONAMESPACE: 2,
    EXCEPTION: 3
}

var logging = false;

let ArgsParseModes = {
    None : "none",
    Space : "space",
    Quote : "quote"
}

var config = {
    defaultToNamespace: true,
    argsParseMode: ArgsParseModes.Quote,
    get noArgsParse(){
        return this.argsParseMode == ArgsParseModes.None;
    },
    set noArgsParse(b){
        this.argsParseMode = b ? ArgsParseModes.None : ArgsParseModes.Quote;
    }
}

function splitInTwo(string, sep){
    let index = string.indexOf(sep);  // Gets the first index where a space occurs
    return (index > 0) ? [string.substr(0, index), string.substr(index + 1)] : [string, ""];
}

function splitInTwoWhitespace(string){
    let [left, right] = splitInTwo(string, " ");
    return [left, right.trimStart()];
}

function print(chunk, encoding, callback){
    process.stdout.write(chunk, encoding, callback);
}

///no check
function addCommands(commandSpace, commands){
    for (k in commands){
        if (commands.hasOwnProperty(k) && (typeof commands[k] == "function" || typeof commands[k] == "object")){
            setCommand(commandSpace, k, commands[k]);
        }
    }
}

//no check
function setCommand(commandSpace, name, command){
    if (name == "") {
        console.error("Command name cannot be empty !");
        return;
    }

    commandSpace[name] = command;
    commandSpace[name].name = name;
}

function listCommandsInSpace(commandSpace){
    let res = "";
    for (let c in commandSpace){
        if (commandSpace.hasOwnProperty(c)){
            let command = commandSpace[c];
            res += "- " + c
            if (command && command.description){
                res+= " : " + command.description
            }
            res += '\n'
        }
    } 
    return res;
}

class Command {
    constructor(f, properties){
        this.f = f,
        Object.assign(this.f, properties)
    }
}

class Namespace {
    constructor(name) {
        let commands = {}
        this.name = name || "[Unnamed namespace]"

        Object.defineProperty(this, "commands", {
            get: () => { return commands },
            set: (val) => {
                this.addCommands(val)
            }
        })
    }

    add(arg1, arg2){
        if (typeof arg1 == "object"){
            addCommands(this.commands, arg1);
        } else {
            if (typeof arg2 != "function" || arg1 == undefined) {
                console.error("CommandLine Error : attempt to add invalid value ")
                return false
            }
            setCommand(this.commands, arg1, arg2)
        }
    }

    setCommand(name, command){
        if (typeof command != "function" || name == undefined) {
            console.error("CommandLine Error : attempt to add invalid value ")
            return false
        } 
        setCommand(this.commands, name, command)
    }

    addCommands(commands){
        if (typeof commands == "object")
            addCommands(this.commands, commands)
    }

    getCommandList(){
        let res = this.name + '\n'
        res += listCommandsInSpace(this.commands);
        return res;
    }
}

function prompt(){
    if (typeof env.prompt == "string"){
        print(env.prompt);
    } else if (typeof env.prompt == "function"){
        print(env.prompt());
    }
}

function startLogging(){
    readline.clearLine();
    readline.cursorTo(process.stdout, 0);
    logging = true;
}

/**
 * @param {string} string 
 */
function parseArgumentsQuoted(string){
    let result = [];

    let fieldStartPos = 0
    let prevWasSeparator = true;
    let openQuotes = false;

    for (let i = 0; i < string.length; i++){
        let c = string[i];

        if (/^\s*$/.test(c) && !openQuotes){
            if (!prevWasSeparator){
                //end of a field
                result.push(string.substring(fieldStartPos, i).replace(/\"/g, "", ));
            }
            prevWasSeparator = true;
        } else {
            let isQuote = c === "\"";

            if (prevWasSeparator){
                //start of a field
                fieldStartPos = isQuote ? i + 1 : i ;
            }

            if (isQuote){
                openQuotes = !openQuotes;
            }

            prevWasSeparator = false;
        }
    }

    if (!prevWasSeparator) result.push(string.substring(fieldStartPos).replace(/\"/g, "", ));

    return result;
}

class CommandResolutionError extends Error {
    constructor(msg){
        super(msg);
    }
}

function handleException(err, commandName){
    startLogging();
    console.error("Uncaught exception while running async command ", commandName + ". Exception : ");
    console.error(err);
    stopLogging();
}

function getArgsParseMode(command){
    if (command.noArgsParse) return ArgsParseModes.None;
    else if (command.argsParseMode) return command.argsParseMode;
    else return config.argsParseMode;
}

function parseArguments(mode, arguments){
    switch (mode){
        case ArgsParseModes.None: return arguments;
        case ArgsParseModes.Space: return arguments.match(/\S+/g) || [];
        case ArgsParseModes.Quote: return parseArgumentsQuoted(arguments)
    }
}

/**
 * Executes a command with the given arguments. The command might be an object, in which case it will be interpreted as a command set.  
 * A command set is a set of named commands, which effectivelemnt works like a namespace ; the first argument is used as a command name within that set.
 * @param {Command | Function} command 
 * @param {string} arguments in single-string form
 * @param {string} commandName name of the command, for error handling purposes
 * @returns whatever the executed command returns
 */
function executeCommand(command, arguments, commandName){
    switch (typeof command){
        case "object": //our "command" is actually a commandspace, the first argument is the command name we are going to look for in this space

            if (command instanceof Command) return executeCommand(command.f, arguments, commandName );

            [commandName, arguments] = splitInTwoWhitespace(arguments);
            parseCommandInCommandSet(command, commandName, arguments);
            break;
        case "function":
            let arg = parseArguments(getArgsParseMode(command), arguments)

            let res = command(arg);

            if (res instanceof Promise){
                res.catch((err)=>{
                    handleException(err, commandName);
                })
            }

            return res;


        case "undefined":
            throw new CommandResolutionError(`nonexistant command (${commandName})`);


        default:
            throw new CommandResolutionError(`nonexistent command ${commandName}. Found value of type ${typeof command}`);
    }
}

/**
 * Looks for a command in a command set (a set of named commands) and executes it
 * @param {object} set 
 * @param {string} commandName 
 * @param {string} arguments 
 * @returns 
 */
function parseCommandInCommandSet(set, commandName, arguments){
    commandName = commandName.trim();
    if (!commandName){
        console.log("This is a command space, containing the following subcommands or sub-command spaces : ");
        console.log(listCommandsInSpace(set));
        return null;
    }
    return parseCommandInContext(set, commandName, arguments);
}

/**
 * Looks for a command in a given context (which can be any table where commands are stored, so namespaces and command spaces) and executes it
 * @param {object} context 
 * @param {string} commandName 
 * @param {string} arguments 
 * @returns 
 */
function parseCommandInContext(context, commandName, arguments){
    let command = context[commandName];
    return executeCommand(command, arguments, commandName);
}

/**
 * Finds a namespace by name.
 * @param {string} namespaceName 
 * @returns 
 */
function getNamespace(namespaceName){
    return namespaces[namespaceName];
}

/**
 * Parses a command line
 * @param {string} commandLine 
 * @returns 
 */
function parseCommand(commandLine){
    commandLine = commandLine.trim();

    if (!commandLine){
        return;
    }

    let [commandName, arguments] = splitInTwoWhitespace(commandLine) //separating the command name and the arguments

    if (commandName.includes(':')){ //namespace:command syntax
        let namespaceName;
        [namespaceName, commandName] = splitInTwo(commandName, ":");

        let namespace = getNamespace(namespaceName);
        if (!namespace) throw new CommandResolutionError(`nonexistant namespace (${namespaceName})`);

        commandName = commandName.trim();
        if (!commandName){
            throw new CommandResolutionError("Empty command name");
        }
        
        parseCommandInContext(namespace.commands, commandName, arguments);
    } else {

        let namespace = default_namespace;
        let command = namespace.commands[commandName];

        if (command){
            executeCommand(command, arguments, commandName);
        } else { //the command does not exist in the default namespace
            if (config.defaultToNamespace){ //but the config says that in that case we default to treating the command name as a namespace name
                let namespaceName = commandName;
                [commandName, arguments] = splitInTwoWhitespace(arguments) // and the first arg as the command name
                let namespace = getNamespace(namespaceName);
                if (!namespace) throw new CommandResolutionError(`${commandName} is neither a namespace or a command (in the default namespace)`);     
                
                return parseCommandInContext(namespace.commands, commandName, arguments);
            }
        }
    }
}

function parseInput(chunk){
    try {
        let res = parseCommand(chunk.replace('\n', '').replace('\r', ''));
    } catch (err){
        if (err instanceof CommandResolutionError){
            console.error("CommandLine Error : ", err);
        } else {
            console.error("Error while running command : ", err);
        }
    }

    logging = false;
    prompt();
}

let default_namespace = new Namespace("[default namespace]");

let namespaces = {
    default: default_namespace
}

let main_module = true;

var logging = false;

function stopLogging(){
    if (logging){
        prompt()
        logging = false;
    }
}

function enableCommand(namespace, name, command){
    if (typeof namespace == "string"){
        namespace = namespaces[namespace];
        if (!namespace) throw 'Namespace ' + namespace + ' does not exist.'
    }
    namespace = (namespace instanceof Namespace) ? namespace : default_namespace;
    namespace.setCommand(name, command);
}

var env = {
    get commands(){
        return default_namespace.commands;
    },
    set commands(val){
        if (typeof val != "object") return false;
        default_namespace.addCommands(val);
    },
    prompt : ">",
    ArgsParseModes,
    get config(){
        return config;
    },
    set config(conf){
        if (typeof(conf) != "object") return false;
        for (k in conf){
            console.log(k, conf[k], config[k]);
            config[k] = conf[k]
        }
    },
    /**
     * Returns a namespace
     * @param {string} name of the namespace
     * @returns a namespace or undefined if the namespace does not exist
     */
    getNamespace(name){
        return namespaces[name]
    },
    /**
     * Creates a new namespace and add it to the list.
     * @param {string} name name of the new namespace
     * @param {object} commands Optional. Table containing the commands in the new namespace.
     * @returns 
     */
    addNamespace(name, commands){
        let nsp = new Namespace(name)

        if (this.isNamespace(name)){
            console.warn(`CommandLine Warning : overwriting namespace ${name}.`);
        }

        namespaces[name] = nsp;

        if (typeof commands == "object") 
            nsp.addCommands(commands);

        return nsp;
    },
    /**
     * Returns whether the given name matches an existing namespace
     * @param {string} name 
     * @returns a boolean
     */
    isNamespace(name){
        return !!namespaces[name]
    },
    /**
     * Sets the new default namespace.
     * @param {string} name name of the new default namespace (must be an existing namespace).
     */
    setDefaultNamespace(name){
        this.defaultNamespace = name;
    },
    /**
     * Returns the current default namespace.
     * @returns {Namespace}
     */
    getDefaultNamespace(){
        return this.defaultNamespace;
    },
    get defaultNamespace(){return default_namespace;},
    set defaultNamespace(name){
        if (this.isNamespace(name))
            default_namespace = namespaces[name];
    },
    /**
     * Adds a default "exit" command to the default namespace
     * @param {Namespace} namespace or to this one if specified.
     */
    enableExit(namespace){
        enableCommand(namespace, "exit", ()=>{
            process.exit(0);
        })
    },

    /**
     * Adds a default "exit" command to the default namespace
     * @param {Namespace} namespace or to this one if specified.
     */
     enableList(namespace){
        enableCommand(namespace, "list", ()=>{
            console.log("List of commands : ")
            for (let nsp of Object.values(namespaces)){
                console.log(nsp.getCommandList())
            }
        })
    },
    /**
     * Call this before you start logging to the console in code that executes asychronously to command execution (i.e. any code not called by a command)
     * The first call to console.log() automatically calls this if you didn't.
     */
    startLogging(){
        startLogging();
    },
    /**
     * Call this when you have finished logging. It can be after every console.log, or after a sequence of console.logs that will execute in the same call.
     * 
     */
    stopLogging : stopLogging
    ,
    /**
     * Starts the command interpretation process. 
     * This means that from now on, data sent to stdin will be interpreted as commands.
     */
    start(){
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        prompt();
    
        

        process.stdin.on('data', function(chunk) {
            parseInput(chunk);
        });
        logging = false;
    },
    /**
     * Attemps to claim the role of main module.
     * @returns true if no one has called this method before.
     */
    takeMainModule(){
        old_val = main_module;
        main_module = false;
        return old_val;
    },
    /**
     * Returns whether someone has claimed the role of main module yet.
     * @returns true true if no one has called takeMainModule before.
     */
    isMainModule(){
        return main_module;
    },
    /**
     * Returns the namespace where you should place your commands according to the main module system.
     * Attemps to take the main module role.
     * @param {string} name the name of a new namespace that will be created if the answer it turns out to be "a new namespace".
     * @returns the default namespace if no one has called takeMainModule yet, a new namespace named <name> if it has been called.
     */
    preferredCommandsLocation(name){
        return this.takeMainModule() ? default_namespace : this.addNamespace(name);
    },
    Command : Command,
    C : Command,
}

function wrapFunction(object, methodName){
    var oldFunc = object[methodName];
    object[methodName] = function(...args){
        if (!logging){
            startLogging();
            logging = true;
        }
        oldFunc(...args)
    }
}

wrapFunction(console, "error");
wrapFunction(console, "log");
wrapFunction(console, "warn");
wrapFunction(console, "info");


module.exports = env