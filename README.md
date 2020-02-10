# Introduction
The intention of this little project is do more easy upload and execute commands through ssh to set on production your projects.

# installation
```
npm install --save-dev @markdomkan/publisher
```

# Usage

## Configuration (not necessary if use without ssh)
```javascript
publisher.config.ssh = {
    host:'your_host',
    privateKey:'path/to/your/id_rsa',
    username:'username'
}
```

## Types of commands

You can add 5 types of commands:
1. **command(** *command* **)**: for execute commands in local like *npm run build*
2. **commandWithInput(** *command*,  *questionMessage*,  *customAnswerWord* **)**: for execute commands with one question, *like git commit -m*. 
3. **sshCommand(** *command* **)**: for execute commands in remote machine. **You must be configured ssh connection before**
4. **sshCommandWithInput(** *command*,  *questionMessage*,  *customAnswerWord* **)**: for execute commands in remote machine with one keyboard input. **You must be configured ssh connection before**
5. **sshDirCopy(** *local_dir*, *remote_dir*  **)**: for copy recursively directories from local to remote through ssh


**To start to execute commands you must be call  *.execute()***

**All questions will be resolved before execute all commands**

## Example
```javascript
const publisher = require('./publisher');

publisher.config.ssh = {
    host:'your_host',
    privateKey:'path/to/your/id_rsa',
    username:'username'
}

publisher
    .command('npm run build')
    .command("git add .")
    .commandWithInput('git commit -a -m "$answer"', "Commit Message")
    .command("git push origin master")
    .sshCommandWithInput('php artisan down --message "$answer"', "Laravel maintenance message")
    .sshCommand('git pull origin master')
    .sshCommand('php artisan up')
    .execute();
```
