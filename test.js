const { Command } = require("./commandLine.js");
var commandLine = require("./commandLine.js")

let is_main_module = commandLine.takeMainModule();

var test2 = require("./test2.js");

console.log("Am I the main module ? : ", is_main_module ? "Yes" : "No");

commandLine.commands.testGetter = () => {
    console.log("test getter")
}

commandLine.commands = {
    testSetter : ()=>{
        console.log("test setter")
    },
    countArgs : (args) => {
        console.log(args.length);
    },
    startTimer : () => {
        setTimeout(() => {
            console.info("Ayo");
            commandLine.stopLogging();
        }, 2000);
    },
    testError(){
        let v = null;
        let a = v.a;
        console.log(a);
    },
    async testAsyncError(){
        return await new Promise((res, rej) => {
            setTimeout(() => {
                try {
                    let v = null;
                    let a = v.a;
                    console.log(a);
                } catch (e){
                    rej(e);
                }
            }, 2000);
        });
    }
}

let test = (args) => {
    console.log(args);
}
test.noArgsParse = false;

commandLine.commands.test = test

let testNAP = (args) => {
    console.log(args);
}
testNAP.noArgsParse = true;

commandLine.commands.testNAP = testNAP

commandLine.commands.pNsp = {
    a: () => {
        console.log("A");
    },
    b: () => {
        console.log("B");
    }
}


commandLine.config = {
    noArgsParse: false
}

commandLine.addNamespace("nsp1").commands = {
    a: () => {
        console.log("nsp1 A");
    },
    b: () => {
        console.log("nsp1 B");
    },
    g : new commandLine.Command(
        {
            a: new commandLine.Command(() => console.log("Test G A")),
            b: new commandLine.Command((arg1, ...args) => {
                console.log("Argument 1 :", arg1, "Other arguments", args);
            }),
        },
        {
            name: "G",
            description: "Testing both nested commands and the Command class"
        }
    ),
}

commandLine.enableExit();

function letsSayThisIsAMdoduleInitializer(namespace){
    let module_specific_info = 12;

    namespace.commands = {
        ping: () => console.log("Module specific text : ", module_specific_info)
    }
}

commandLine.enableList()

letsSayThisIsAMdoduleInitializer(commandLine.addNamespace("GMBC"));

letsSayThisIsAMdoduleInitializer(commandLine);

//aaa.setDefaultNamespace("nsp1");


setInterval(function() {
    //console.log("tss")
    commandLine.stopLogging();
}, 3000);


let nsp = commandLine.getNamespace("nsp1")
nsp.commands.a.description = "test Description"
nsp.getCommandList()

commandLine.prompt = () => (new Date()).toDateString() + ">"
commandLine.logPrefix = true;

commandLine.start()