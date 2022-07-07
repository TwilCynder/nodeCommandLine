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

aaa.config = {
    noArgsParse: false
}

/*
setInterval(function() {
    console.log("tss")
    aaa.stopLogging();
}, 3000);
*/

aaa.prompt = () => (new Date()).toDateString() + ">"
aaa.logPrefix = true;

aaa.start()