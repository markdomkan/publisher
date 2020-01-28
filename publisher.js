const exec = require('child_process').exec;
const inquirer = require('inquirer')
const ora = require('ora');
const ssh = new (require('node-ssh'))();
const fs = require('fs');
const commands = [];
let index = 0;
const promisses = [];
const Types = {
    COMMAND: 'command',
    SSH_COPY: 'ssh-copy',
    SSH_COMMAND: 'ssh-command',
}
let spinner = null;
let sshConnected = false;
function checkConnect(config) {
    if (sshConnected) {
        return new Promise(resolve => resolve(true));
    }
    try {
        return new Promise((resolve, reject) => {
            ssh.connect(config.ssh).then(() => {
                sshConnected = true;
                resolve(true);
            })
        });
    } catch (error) {
        return new Promise((resolve, reject) => reject(error));
    }
}
function exectueCommand(command, resolve, reject) {
    exec(command.command, (err, stdout, stderr) => {
        if (err != null) {
            reject(stdout);
        } else {
            resolve(stdout);
        }
    })
}

function executeSshCopy(config, command, resolve, reject) {

    if (!fs.existsSync(command.source)) {
        reject("The source not exist");
    }

    if (!fs.lstatSync(command.source).isDirectory()) {
        reject("The source must be a directory. Sorry :(");
    }

    checkConnect(config).then(conected => {
        if (conected) {
            const failed = [];
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

        } else {
            reject(new Error('Error when connect'));
        }
    });
}

function executeSshCommand(config, command, resolve, reject) {
    checkConnect(config).then(conected => {
        if (conected) {
            ssh.execCommand(command.command)
                .then(result => {
                    if (result) {
                        resolve(result.stdout);
                    }
                    else {
                        reject();
                    }
                })
        } else {
            reject(new Error('Error when connect'));
        }
    });

}


function switchType(command, config) {
    return new Promise((resolve, reject) => {
        switch (command.type) {
            case Types.COMMAND:
                exectueCommand(command, resolve, reject);
                break;

            case Types.SSH_COPY:
                executeSshCopy(config, command, resolve, reject);
                break;

            case Types.SSH_COMMAND:
                executeSshCommand(config, command, resolve, reject);
                break;

        }
    });
}

function execute(config) {
    if (index < commands.length) {
        if (!spinner) {
            spinner = ora({ prefixText: true }).start();
        }

        if (commands[index]) {
            switch (commands[index].type) {
                case Types.COMMAND:
                    spinner.start(`Doing: ${commands[index].command}`);
                    break;

                case Types.SSH_COPY:
                    spinner.start(`Doing: copy ${commands[index].source} to ${commands[index].destination}`);
                    break;

                case Types.SSH_COMMAND:
                    spinner.start(`Doing: ${commands[index].command}`);
                    break;

            }
        }

        switchType(commands[index], config).then(result => {

            switch (commands[index].type) {
                case Types.COMMAND:
                    spinner.succeed(`${index + 1} - ${commands[index].command}`);
                    if (result) {
                        spinner.info(result);
                    }
                    break;

                case Types.SSH_COPY:
                    spinner.succeed(`${index + 1} - copy ${commands[index].source} to ${commands[index].destination}`);
                    break;

                case Types.SSH_COMMAND:
                    spinner.succeed(`${index + 1} - ${commands[index].command}`);
                    if (result) {
                        spinner.info(result);
                    }
                    break;
            }
            index++;
            execute(config);
        }).catch(error => {
            spinner.fail(`${index + 1} - ${error}`);
            process.exit(0);
        });
    }
    else {
        if (spinner) {
            spinner.succeed("ALL DONE! :)");
            spinner.clear();
            process.exit(0);
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
            ssh: {
                host: 'localhost',
                username: 'username',
                privateKey: '/.ssh/id_rsa'
            }
        };
    }

    command(command) {
        promisses.push((resolve) => {
            commands.push({ command, type: Types.COMMAND });
            resolve();
        });
        return this;
    }

    sshDirCopy(source, destination) {
        promisses.push((resolve) => {
            commands.push({ source, destination, type: Types.SSH_COPY });
            resolve();
        });
        return this;
    }

    sshCommand(command) {
        promisses.push((resolve) => {
            commands.push({ command, type: Types.SSH_COMMAND });
            resolve();
        });
        return this;
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
        return this;
    }

    sshCommandWithInput(command, questionMessage, answer = '$answer') {
        promisses.push((resolve) => {
            const key = String(promisses.length);
            inquirer.prompt([{
                type: 'input',
                name: key,
                message: questionMessage,
            }]).then(answers => {
                commands.push({ command: command.replace(answer, answers[key]), type: Types.SSH_COMMAND });
                resolve();
            })
        });
        return this;
    }

    execute() {
        (new Promise(resolve => promisesSequence(0, resolve)))
            .then(() => execute(this.config));
    }
}

module.exports = new Publisher();