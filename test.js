var aaa = require("./commandLine.js")

aaa.commands.testGetter = () => {
    console.log("test getter")
}

aaa.commands = {
    testSetter : ()=>{
        console.log("test setter")
    },
}

aaa.prompt = () => (new Date()).toDateString() + ">"

aaa.start()