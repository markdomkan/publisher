const exec = require('child_process').exec;

const execute = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err != null) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        })
    });
}

class Publisher {
    constructor() {
        this.commands = [];
        this.index = 0;
    }
    execute() {
        if (this.index < this.commands.length) {
            execute(this.commands[this.index]).then(success => {
                console.log("\x1b[32m%s\x1b[0m", `${this.index + 1} - ${success}`);
                this.index++;
                this.execute();
            }).catch(error => {
                console.log("\x1b[31m%s\x1b[0m", `${this.index + 1} - ${error}`);
            });
        }
    }
}

exports.publisher = new Publisher();