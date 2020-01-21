var errcodes = {
    NOCOMMAND : 1,
}

function print(chunk, encoding, callback){
    process.stdout.write(chunk, encoding, callback);
}

var commands = {
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
    prompt : ">"
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
    
    return [true, commands[words[0]](words.slice(1))];
}

env.start = function(){
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    prompt();

    process.stdin.on('data', function(chunk) {
        let [success, res, more] = parseCommand(chunk.replace('\n', '').replace('\r', ''));
        if (!success){
            switch(res){
                case errcodes.NOCOMMAND :
                    console.log("Error : nonexistant command")
            }  
        }
        prompt();
    });
}


module.exports = env