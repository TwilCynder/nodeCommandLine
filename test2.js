var cl = require("./commandLine.js")

let space = cl.preferredCommandsLocation("t2");

space.commands = {
    test2: ()=> {
        console.log("Test 2");
    }
}