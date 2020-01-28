const publisher = require('./publisher');

publisher
    .command("git add .")
    .commandWithInput('git commit -a -m "$answer"', "Commit")
    .command("git push origin master")
    .execute();