var aaa = require("./commandLine.js")

aaa.commands.hehe = () => {
    console.log("hehe")
}

aaa.commands = {
    haha : ()=>{
        console.log("test")
    },
}

aaa.prompt = () => (new Date()).toDateString() + ">"

aaa.start()