const exec = require('child_process').exec;
const inquirer = require('inquirer')
const ora = require('ora');
const ssh = new (require('node-ssh'))();
const commands = [];
let index = 0;
const promisses = [];
const Types = {
    COMMAND: 'command',
    SSH_COPY: 'ssh-copy',
    SSH_COMMAND: 'ssh-command',
}
let spinner = null;
const sshConnected = false;
function checkConnect(config) {
    if (sshConnected) {
        return new Promise(resolve => resolve());
    }
    return ssh.connect(config).then(() => sshConnected = true)
}
function exectueCommand(command, resolve, reject) {
    exec(command.command, (err, stdout, stderr) => {
        if (err != null) {
            reject();
        } else {
            resolve(stdout);
        }
    })
}

function executeSshCopy(command, resolve, reject) {
    checkConnect.then(() => {
        const failed = []
        ssh.putDirectory(command.source, command.destination, {
            recursive: true,
            concurrency: 10,
            tick: (localPath, remotePath, error) => {
                if (error) {
                    failed.push(`Failed when was copied ${localPath} to ${remotePath}. Error: ${error}`);
                }
            }
        }).then((status) => {
            if (status) {
                resolve();
            } else {
                reject('failed transfers', failed.join(', '));
            }
        })
    });
}

function executeSshCommand(command, resolve, reject) {
    checkConnect.then(() => {
        ssh.execCommand(command.command)
            .then(result => {
                if (result) {
                    resolve();
                }
                else {
                    reject();
                }
            })
    });
}


function switchType(command) {
    return new Promise((resolve, reject) => {
        switch (command.type) {
            case Types.COMMAND:
                exectueCommand(command, resolve, reject);
                break;

            case Types.SSH_COPY:
                executeSshCopy(command, resolve, reject);
                break;

            case Types.SSH_COMMAND:
                executeSshCommand(command, resolve, reject);
                break;

        }
    });
}

function execute() {
    if (index < commands.length) {
        if (!spinner) {
            spinner = ora({ prefixText: true }).start();
        }
        spinner.text = commands[index];
        switchType(commands[index]).then(() => {
            spinner.succeed(`${index + 1} - ${commands[index].command}`);
            spinner.start(`Doing: ${commands[index + 1].command}`);
            index++;
            execute();
        }).catch(error => {
            spinner.fail(`${index + 1} - ${error}`);
        });
    }
    else {
        if (spinner) {
            spinner.stop();
        }

    }
}

function promisesSequence(id, resolve) {
    if (id < promisses.length) {
        (new Promise(promisses[id])).then(() => promisesSequence(id + 1, resolve));
    } else {
        resolve();
    }
}

class Publisher {
    constructor() {
        this.config = {
            host: 'localhost',
            username: 'forge',
            privateKey: '/home/steel/.ssh/id_rsa'
        };
    }

    command(command) {
        promisses.push((resolve) => {
            commands.push({ command, type: Types.COMMAND });
            resolve();
        });
    }

    sshCopy(source, destination) {
        promisses.push((resolve) => {
            commands.push({ source, destination, type: Types.SSH_COPY });
            resolve();
        });
    }

    sshCommand(command) {
        promisses.push((resolve) => {
            commands.push({ command, type: Types.SSH_COMMAND });
            resolve();
        });
    }

    commandWithInput(command, questionMessage, answer = '$answer') {
        promisses.push((resolve) => {
            const key = String(promisses.length);
            inquirer.prompt([{
                type: 'input',
                name: key,
                message: questionMessage,
            }]).then(answers => {
                commands.push({ command: command.replace(answer, answers[key]), type: Types.COMMAND });
                resolve();
            })
        });
    }

    execute() {
        (new Promise(resolve => promisesSequence(0, resolve))).then(() => execute());
    }
}

module.exports = new Publisher();