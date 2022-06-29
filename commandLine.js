var errcodes = {
    NOCOMMAND : 1,
}

function print(chunk, encoding, callback){
    process.stdout.write(chunk, encoding, callback);
}

var commands = {
}

function prompt(){
    if (typeof env.prompt == "string"){
        print(env.prompt);
    } else if (typeof env.prompt == "function"){
        print(env.prompt());
    }
}


function parseCommand(command){
    let words = command.split(" ")
    if (typeof commands[words[0]] != "function") return [false,errcodes.NOCOMMAND,words[0]];
    
    let commandFunction = commands[words[0]];

    let arg = (commandFunction.noArgsParse) ? 
        ((words.length > 1) ? command.slice(command.indexOf(" ") + 1) : "") :
        words.slice(1);

    return [true, commandFunction(arg)];
}

var env = {
    get commands(){
        return commands
    },
    set commands(val){
        if (typeof val != "object") return false;
        for (k in val){
            if (val.hasOwnProperty(k) && typeof val[k] == "function"){
                this.commands[k] = val[k]
            }
        }
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
    start(){
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        prompt();
    
        process.stdin.on('data', function(chunk) {
            let [success, res, more] = parseCommand(chunk.replace('\n', '').replace('\r', ''));
            if (!success){
                switch(res){
                    case errcodes.NOCOMMAND :
                        console.log("Error : nonexistant command (" + more + ")");
                }  
            }
            prompt();
        });
        logging = false;
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