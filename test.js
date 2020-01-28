const publisher = require('./publisher');

publisher.command("git add .");
publisher.commandWithInput('git commit -a -m "$answer"', "Nom del commit");
publisher.command("git push origin master");
publisher.execute();