const exec = require('child_process').exec;
const colors = require('colors');
const ora = require('ora');


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
        this.spinner = ora({ prefixText: true }).start();
    }
    execute() {

        if (this.index < this.commands.length) {
            this.spinner.text = this.commands[this.index];
            execute(this.commands[this.index]).then(success => {
                this.spinner.succeed(`${this.index + 1} - ${success}`);
                this.index++;
                this.execute();
            }).catch(error => {
                this.spinner.error(`${this.index + 1} - ${error}`);
            });
        }
        else {
            this.spinner.stop();
        }
    }
}

exports.publisher = new Publisher();