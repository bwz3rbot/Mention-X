const dotenv = require('dotenv').config({
    path: "pw.env"
});
const colors = require('colors');
const Snoolicious = require('./lib/Snoolicious');
const snoolicious = new Snoolicious();
const SUBS = process.env.SUBREDDITS.split(',').map((sub) => sub.trim());


async function handleCommand(task) {
    const id = `${task.item.parent_id}${task.item.id}${task.item.created_utc}`;
    const isSaved = await snoolicious.requester.getComment(task.item).saved;
    // Check if the item was saved first.

    if (!isSaved && task.item.author.name === process.env.OWNER_USERNAME) {
        console.log("New Command recieved: ".grey);
        switch (task.command.directive) {
            case 'xpost':
                const p = task.item.parent_id;
                // Check that the parent was a submission first.
                if (p.includes("t3_")) {
                    const parentId = p.replace("t3_", "");
                    console.log(`Getting parent: "${parentId}"`);
                    const parent = await getParent(parentId);
                    await xpost(parent);
                } else { // Parent was not a submission. 
                    console.log("Parent item was a comment. Must be a submission.".red);
                }
                break;
            default:
                console.log("Invalid user or Invalid command! the command: ".red, task.command);
        }
        // Save the item so snoolicious won't process it again.
        console.log("saving".grey);
        await snoolicious.requester.getComment(task.item.id).save();
    } else {
        console.log("Item was already saved!".red);
    }
    console.log("Size of the queue: ", snoolicious.tasks.size());

}

/* [Snoolicious Run Cycle] */
const INTERVAL = (process.env.INTERVAL * 1000 * 60);
async function run() {

        await snoolicious.getMentions(2);

        await snoolicious.queryTasks(handleCommand, null);
        console.log(`Finished Quereying Tasks. Sleeping for ${INTERVAL/1000/60} minutes...`.grey);
        setTimeout(async () => {
            await run()
        }, (INTERVAL));
    }
    (async () => {
        await run();
    })();


async function getParent(id) {
    return snoolicious.requester.getSubmission(id).fetch();
}

async function xpost(post) {
    for (const sub of SUBS) {
        console.log(`X-Posting to r/${sub}...`.grey);
        
        await snoolicious.requester._newObject('Submission', post, true).submitCrosspost({
            subredditName: sub,
            title: post.title,
            originalPost: this,
            resubmit: false,
            sendReplies: true
        });
        console.log(`X-Posting success!`.green);
    }
}