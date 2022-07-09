//TODO : autocompletion, actual doc (generate doc + multiple md files), 
//description system (basically, make the commands more complex, like the commandline package)

var errcodes = {
    NOCOMMAND : 1,
    NONAMESPACE: 2
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
            commandSpace[k] = commands[k]
        }
    }
}

//no check
function setCommand(commandSpace, name, command){
    commandSpace[name] = command;
}

class Namespace {
    constructor(name) {
        let commands = {}
        this.name = name

        Object.defineProperty(this, "commands", {
            get: () => { return commands },
            set: (val) => {
                this.addCommands(val)
            }
        })
    }

    add(arg1, arg2){
        if (typeof arg1 == "object"){
            addCommands(this.commands, arg1)
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
}

function prompt(){
    if (typeof env.prompt == "string"){
        print(env.prompt);
    } else if (typeof env.prompt == "function"){
        print(env.prompt());
    }
}

/**
 * Executes a command with a give name with the given arguments string
 * @param {string} commandName the name of the command
 * @param {string} arguments the arguments, in the form of the original string (not split yet)
 * @param {object} commandSpace the table where we are looking for the command
 * @returns [success, result, more] : a boolean indicating whether the call succeeded, the result of the function OR an error code, and more information if an error occured
 */
function parseCommandInContext(commandName, arguments, commandSpace){
    let command = commandSpace[commandName];

    switch (typeof command){
        case "object": //our "command" is actually a commandspace, the first argument is the command name we are going to look for in this space
            [commandName, arguments] = splitInTwoWhitespace(arguments);
            return parseCommandInContext(commandName, arguments, command);
        case "function":
            let arg = (config.noArgsParse || command.noArgsParse) ? 
                arguments : arguments.match(/\S+/g);
            return [true, command(arg)];
        default:
            return [false,errcodes.NOCOMMAND,commandName];
    }
}

/**
 * Tries executing the command with the given name with the given arguments string in the namespace with the given name, if exists.
 * @param {string} commandName the name of the command
 * @param {string} arguments the arguments, in the form of the original string (not split yet)
 * @param {string} namespace the name of a namespace
 * @returns [success, result, more] : a boolean indicating whether the call succeeded, the result of the function OR an error code, and more information if an error occured
 */
function parseCommandInNamespace(commandName, arguments, namespace){
    let context = namespaces[namespace];

    if (!context) return [false, errcodes.NONAMESPACE, namespace]

    return parseCommandInContext(commandName, arguments, context.commands);
}

/**
 * Parses a command line
 * @param {string} commandLine 
 * @returns 
 */
function parseCommand(commandLine){
    commandLine = commandLine.trimStart();

    let [commandName, arguments] = splitInTwoWhitespace(commandLine) //separating the command name and the arguments

    if (commandName.includes(":")){ //namespace syntax
        let namespace;
        [namespace, commandName] = splitInTwo(commandName, ":");
        
        return parseCommandInNamespace(commandName, arguments, namespace)
    } else {
        let result = parseCommandInContext(commandName, arguments, default_namespace.commands);

        if (!result[0] && (result[1] == errcodes.NOCOMMAND)){ //the command does not exist in the default namespace
            if (config.defaultToNamespace){ //but the config says that in that case we default to treating the command name as a namespace name
                let namespace = commandName;
                [commandName, arguments] = splitInTwoWhitespace(arguments) // and the first arg as the command name
                return parseCommandInNamespace(commandName, arguments, namespace);
            }
        }
        return result;
    }

}

var config = {
    noArgsParse: false,
    defaultToNamespace: true
}

let default_namespace = new Namespace("")

let namespaces = {
    default: default_namespace
}

let main_module = true;

var env = {
    get commands(){
        return default_namespace.commands;
    },
    set commands(val){
        if (typeof val != "object") return false;
        default_namespace.addCommands(val);
    },
    prompt : ">",
    get config(){
        return config
    },
    set config(conf){
        if (typeof(val) != "object") return false;
        for (k in conf){
            if (conf.hasOwnProperty(k)){
                config[k] = conf[k]
            }
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
        namespace = (namespace instanceof Namespace) ? namespace : default_namespace;
        namespace.setCommand("exit", ()=>{
            process.exit(0);
        })
    },
    /**
     * Starts the command interpretation process. 
     * This means that from now on, data sent to stdin will be interpreted as commands.
     */
    start(){
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        prompt();
    
        process.stdin.on('data', function(chunk) {
            let [success, res, more] = parseCommand(chunk.replace('\n', '').replace('\r', ''));
            if (!success){
                switch(res){
                    case errcodes.NOCOMMAND :
                        console.error(`CommandLine Error : nonexistant command (${more})`);
                        break;
                    case errcodes.NONAMESPACE :
                        console.error(`CommandLine Error : nonexistant namespace (${more})`);
                        break;
                }  
            }
            prompt();
        });
        logging = false;
    },
    /**
     * Call this before you start logging to the console in code that executes asychronously to command execution (i.e. any code not called by a command)
     * The first call to console.log() automatically calls this if you didn't.
     */
    startLogging(){
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        logging = true;
    },
    /**
     * Call this when you have finished logging. It can be after every console.log, or after a sequence of console.logs that will execute in the same call.
     * 
     */
    stopLogging(){
        if (logging){
            prompt()
            logging = false;
        }
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
    }
}

var logging = false;
var oldLog = console.log;
console.log = function(...args){
    if (!logging){
        env.startLogging();
        logging = true;
    }
    oldLog(...args)
}

module.exports = env