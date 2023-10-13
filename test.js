const { Command } = require("./commandLine.js");
var aaa = require("./commandLine.js")

let is_main_module = aaa.takeMainModule();

var test2 = require("./test2.js");

console.log("Am I the main module ? : ", is_main_module ? "Yes" : "No");

aaa.commands.testGetter = () => {
    console.log("test getter")
}

aaa.commands = {
    testSetter : ()=>{
        console.log("test setter")
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

aaa.commands.test = test

let testNAP = (args) => {
    console.log(args);
}
testNAP.noArgsParse = true;

aaa.commands.testNAP = testNAP

aaa.commands.pNsp = {
    a: () => {
        console.log("A");
    },
    b: () => {
        console.log("B");
    }
}


aaa.config = {
    noArgsParse: false
}

aaa.addNamespace("nsp1").commands = {
    a: () => {
        console.log("nsp1 A");
    },
    b: () => {
        console.log("nsp1 B");
    },
    g : new aaa.Command(
        {
            a: new aaa.Command(() => console.log("Test G A")),
            b: new aaa.Command((arg1, ...args) => {
                console.log("Argument 1 :", arg1, "Other arguments", args);
            }),
        },
        {
            name: "G",
            description: "Testing both nested commands and the Command class"
        }
    ),
}

aaa.enableExit();

function letsSayThisIsAMdoduleInitializer(namespace){
    let module_specific_info = 12;

    namespace.commands = {
        ping: () => console.log("Module specific text : ", module_specific_info)
    }
}

aaa.enableList()

letsSayThisIsAMdoduleInitializer(aaa.addNamespace("GMBC"));

letsSayThisIsAMdoduleInitializer(aaa);

//aaa.setDefaultNamespace("nsp1");


setInterval(function() {
    //console.log("tss")
    aaa.stopLogging();
}, 3000);


let nsp = aaa.getNamespace("nsp1")
nsp.commands.a.description = "test Description"
nsp.getCommandList()

aaa.prompt = () => (new Date()).toDateString() + ">"
aaa.logPrefix = true;

aaa.start()