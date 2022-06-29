var aaa = require("./commandLine.js")

aaa.commands.testGetter = () => {
    console.log("test getter")
}

aaa.commands = {
    testSetter : ()=>{
        console.log("test setter")
    },
}

aaa.commands.test = (args) => {
    console.log(typeof args);
    console.log(args);
}

aaa.commands.test.noArgsParse = true;

/*
setInterval(function() {
    console.log("tss")
    aaa.stopLogging();
}, 3000);
*/

aaa.prompt = () => (new Date()).toDateString() + ">"
aaa.logPrefix = true;

aaa.start()