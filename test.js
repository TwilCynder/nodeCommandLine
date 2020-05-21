var aaa = require("./commandLine.js")

aaa.commands.testGetter = () => {
    console.log("test getter")
}

aaa.commands = {
    testSetter : ()=>{
        console.log("test setter")
    },
}

setInterval(function() {
    console.log("tss")
    aaa.stopLogging();
}, 3000);

aaa.prompt = () => (new Date()).toDateString() + ">"

aaa.start()