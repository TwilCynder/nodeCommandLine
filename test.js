var aaa = require("./commandLine.js")

aaa.commands.testGetter = () => {
    console.log("test getter")
}

aaa.commands = {
    testSetter : ()=>{
        console.log("test setter")
    },
}

let test = (args) => {
    console.log(args);
}
test.noArgsParse = false;

aaa.commands.test = test

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
    }
}

//aaa.setDefaultNamespace("nsp1");

/*
setInterval(function() {
    console.log("tss")
    aaa.stopLogging();
}, 3000);
*/


aaa.prompt = () => (new Date()).toDateString() + ">"
aaa.logPrefix = true;

aaa.start()