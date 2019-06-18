require('dotenv').config();

const os = require('os');
const Snoowrap = require('snoowrap');
const Snoostorm = require('snoostorm');
let checkComment = require('./src');

// Build Snoowrap and Snoostorm clients
const main = new Snoowrap({
    userAgent: 'thesaurize-this',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS
});
const client = new Snoostorm(main);

const listener1 = new Snoowrap({
    userAgent: 'thesaurize-this-helper1',
    clientId: process.env.CLIENT_ID1,
    clientSecret: process.env.CLIENT_SECRET1,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS
});
const listener1client = new Snoostorm(listener1);

const listener2 = new Snoowrap({
    userAgent: 'thesaurize-this-helper2',
    clientId: process.env.CLIENT_ID2,
    clientSecret: process.env.CLIENT_SECRET2,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS
});
const listener2client = new Snoostorm(listener2);



// Configure options for stream: subreddit & results per query
const streamOpts = {
    subreddit: 'all',
    results: 200,
    pollTime: 2500
};


// Create a Snoostorm CommentStream with the specified options
let comments = client.CommentStream(streamOpts);

// On comment, perform whatever logic you want to do
comments.on('comment', async (comment) => {
    try{
        await checkComment(comment, main);
    } catch(err){
        console.error(err);
    }

});

// listener comments
let listener1Comments;

function offsetListener1() {
    listener1Comments = listener1client.CommentStream(streamOpts);
    listener1Comments.on('comment', async (comment) => {
        try{
            await checkComment(comment, listener1);
        } catch(err){
            console.error(err);
        }

    });
}

setTimeout(offsetListener1, 1500);

// listener2 is being directed to only monitor /r/ThesaurizeThis to increase catch rate there.
const streamOptsThes = {
    subreddit: 'ThesaurizeThis,CopyPasta,DarkJokes',
    results: 20,
    pollTime: 2500
};
let listener2Comments = listener2client.CommentStream(streamOptsThes);
listener2Comments.on('comment', async (comment) => {
    try{
        await checkComment(comment, listener2);
    } catch(err){
        console.error(err);
    }
});