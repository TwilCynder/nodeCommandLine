//TODO : default exit command, SANITIZE COMMANDS (REMOVE SPACES)

var errcodes = {
    NOCOMMAND : 1,
    NONAMESPACE: 2
}

function splitInTwo(string, sep){
    let index = string.indexOf(sep);  // Gets the first index where a space occours
    return (index > 0) ? [string.substr(0, index), string.substr(index + 1)] : [string, ""];
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
function setCommand(commandSpace, command, name){
    commandSpace[name] = command;
}

class namespace {
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
            setCommand(this.commands, arg2, arg1)
        }
    }

    setCommand(command, name){
        if (typeof command != "function" || name == undefined) {
            console.error("CommandLine Error : attempt to add invalid value ")
            return false
        } 
        setCommand(this.commands, command, name)
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

var config = {
    noArgsParse: false,
    defaultToNamespace: true
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
            [commandName, arguments] = splitInTwo(arguments, " ");
            return parseCommandInContext(commandName, arguments, command);
        case "function":
            let arg = (config.noArgsParse || command.noArgsParse) ? 
                arguments : arguments.split(" ");
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

function parseCommand(commandLine){
    let [commandName, arguments] = splitInTwo(commandLine, " ") //separating the command name and the arguments

    if (commandName.includes(":")){ //namespace syntax
        let namespace;
        [namespace, commandName] = splitInTwo(commandName, ":");
        
        return parseCommandInNamespace(commandName, arguments, namespace)
    } else {
        let result = parseCommandInContext(commandName, arguments, default_namespace.commands);

        if (!result[0] && (result[1] == errcodes.NOCOMMAND)){ //the command does not exist in the default namespace
            if (config.defaultToNamespace){ //but the config says that in that case we default to treating the command name as a namespace name
                let namespace = commandName;
                [commandName, arguments] = splitInTwo(arguments) // and the first arg as the command name
                return parseCommandInNamespace(commandName, arguments, namespace);
            }
        }
        return result;
    }

}

let default_namespace = new namespace("")

let namespaces = {
    default: default_namespace
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
    startLogging(){
        process.stdout.clearLine();
        process.stdout.cursorTo(0)
        logging = true;
    },
    stopLogging(){
        if (logging){
            prompt()
            logging = false;
        }
    },
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
    getNamespace(name){
        return namespaces[name]
    },
    addNamespace(name, commands){
        let nsp = new namespace(name)

        if (this.isNamespace(name)){
            console.warn(`CommandLine Warning : overwriting namespace ${name}.`);
        }

        namespaces[name] = nsp;

        if (typeof commands == "object") 
            nsp.addCommands(commands);

        return nsp;
    },
    isNamespace(name){
        return !!namespaces[name]
    },
    setDefaultNamespace(name){
        this.defaultNamespace = name;
    },
    getDefaultNamespace(){
        return this.defaultNamespace;
    },
    get defaultNamespace(){return default_namespace;},
    set defaultNamespace(name){
        if (this.isNamespace(name))
            default_namespace = namespaces[name];
    },
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
