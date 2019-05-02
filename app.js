require('dotenv').config();

const Snoowrap = require('snoowrap');
const Snoostorm = require('snoostorm');
const thesaurize = require('thesaurize');


const thesaurizethis = "!testthesaurizethis";
const fandango = "!testdothefandango";
const globalCallWords = [thesaurizethis, fandango];

const loopPrevention = "ThesaurizeThisBot is the bestest ever";
const callWordThesaurus = {
    "thesaurizethis": [loopPrevention],
    "dothefandango": [loopPrevention]
};
const limitedPosts = {};
const callWordHistory = [];

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
        await checkComment(comment);
    } catch(err){
        console.error(err);
    }

});

// listener comments
let listenerComments;

function offsetListener(arg) {
    listenerComments = listener1client.CommentStream(streamOpts);
    listenerComments.on('comment', async (comment) => {
        try{
            await checkComment(comment);
        } catch(err){
            console.error(err);
        }

    });
}

setTimeout(offsetListener, 1250);



async function checkComment(comment){
    if(comment.author.name !== "ThesaurizeThisBot"){
        let commentBody;
        let callWords = containsCallWord(comment);
        if (callWords.length && ! await inReplyHistory(comment)){
            let parentComment = await main.getComment(comment.parent_id).body;
            commentBody = parentComment || comment.body;
            processComment(comment, commentBody, callWords);
        } else if(comment.subreddit_name_prefixed === "r/ThesaurizeThis" && ! await inReplyHistory(comment)){
            commentBody = await comment.body;
            processComment(comment, commentBody, callWords);
        }
    }
}

async function inReplyHistory(comment){
    let inHistory = false;
    if(!callWordHistory.includes(await comment.id)){
        callWordHistory.push(await comment.id);
        if(callWordHistory.length > 200){
            callWordHistory.shift();
        }
    } else {
        inHistory = true;
    }
    return inHistory;
}

async function processComment(comment, commentText, callWords){

    commentText = commentText.split(`\n\n***\n\n`)[0];

    let insanity = thesaurize(commentText, {customThesaurus: callWordThesaurus});

    if(callWords.includes(fandango)){
        for(let i = 0; i < 10; i++){
            insanity = thesaurize(insanity);
        }
    }

    console.log("~~~~~~~~~~~~~");
    console.log(comment.subreddit_name_prefixed);
    console.log(insanity);
    console.log("~~~~~~~~~~~~~");

    insanity = trimLongComment(insanity);

    if(inBannedSub(comment.subreddit_name_prefixed)){
        bannedReply(insanity, comment.author.name, comment.subreddit_name_prefixed, comment.permalink);
    } else if(limitedSubLimitReached(comment)){
        limitedReply(insanity, comment.author.name, comment.subreddit_name_prefixed, comment.permalink);
    } else {
        //comment.reply(insanity + subScript());
        let replyText = insanity + subScript();
        mainReply(comment, replyText)
    }
}

async function mainReply(comment, reply){
    try{
        await comment.reply(reply);
    } catch (err){
        console.error(err);
    }

}

function bannedReply(insanity, user, subreddit, commentLink){
    let bannedResponse = `^Paging ^u/${user}. [^Thank ^you ^for ^calling](${commentLink}), ^unfortunately ^I ^am ^banned ^in ^${subreddit.substring(1, subreddit.length)}, ^so ^please ^enjoy ^your ^translated ^text.`;
    try{
        main.getSubmission('9y3efk').reply(insanity + subScript(bannedResponse));
    } catch(err) {
        console.error(err);
    }

}

function limitedReply(insanity, user, subreddit, commentLink){
    let subLimits = inLimitedSubs(subreddit);
    let limitedResponse = `^Paging ^u/${user}. [^Thank ^you ^for ^calling](https://reddit.com${commentLink}). ^To ^keep ^spam ^down, ^${subreddit} ^mods ^have ^requested ^I ^limit ^my ^responses ^to ^${subLimits.postLimit} ^per ^post, ^${subLimits.userLimit} ^per ^user. ^But ^don't ^fret, ^you ^can ^continue ^thesaurizing ^in ^this ^post.`;
    try {
        main.getSubmission('9y3efk').reply(insanity + subScript(limitedResponse));
    } catch(err){
        console.error(err);
    }
}

function containsCallWord(comment){
    return globalCallWords.filter( callWord => comment.body.toLowerCase().includes(callWord));

}

function subScript(customText){
    let baseMessage = "^(This is a bot. I try my best, but my best is 80% mediocrity 20% hilarity. Created by OrionSuperman. Check out my best work at /r/ThesaurizeThis)";
    let message = customText || baseMessage;
    return `\n\n***\n\n${message}`;
}

function inLimitedSubs(subName){
    let limitedSubs = {
        "r/copypasta": {
            "postLimit": 10,
            "userLimit": 2
        }
    };

    return limitedSubs[subName];
}

function limitedSubLimitReached(comment){

    let subLimitValues = inLimitedSubs(comment.subreddit_name_prefixed);
    if(!subLimitValues){
        return false;
    }
    let submissionID = comment.id;
    limitedPosts[submissionID] = limitedPosts[submissionID] || {};
    limitedPosts[submissionID].postCount = limitedPosts[submissionID].postCount + 1 || 1;
    limitedPosts[submissionID][comment.author.name] = limitedPosts[submissionID][comment.author.name] + 1 || 1;
    return !(limitedPosts[submissionID].postCount <= subLimitValues.postLimit && limitedPosts[submissionID][comment.author.name] <= subLimitValues.userLimit);
}

function inBannedSub(subName){
    let bannedSubs = [
        "r/politics",
        "r/gaming",
        "r/askreddit",
        "r/furry",
        "r/memes",
        "r/dankmemes",
        "r/blackpeopletwitter",
        "r/programmerhumor",
        "r/worldbuilding",
        "r/onewordban",
        "r/creepypms",
        "r/politicalhumor",
        "r/circlejerk",
        "r/emojipasta",
        "r/peoplefuckingdying",
        "r/sex",
        "r/legaladvice",
        "r/writingprompts",
        "r/explainlikeimfive",
        "r/competitiveoverwatch",
        "r/wtf",
        "r/talesfromtechsupport",
        "r/youtubehaiku",
        "r/magictcg",
        "r/mma",
        "r/wholesomememes",
        "r/nfl",
        "r/chapotraphouse",
        "r/rainbow6",
        "r/casualuk",
        "r/walkingwarrobots",
        "r/dogswithjobs",
        "r/todayilearned",
        "r/pcmasterrace",
        "r/fortnitebr",
        "r/pics",
        "r/tattoos",
        "r/aww",
        "r/nottheonion",
        "r/animalsbeingbros",
        "r/jokes",
        "r/nascar",
        "r/gamingcirclejerk",
        "r/drugs",
        "r/pewdiepiesubmissions",
        "r/fortnite",
        "r/murderedbywords",
        "r/chibears",
        "r/pointlessstories",
        "r/codzombies",
        "r/baseball",
        "r/army",
        "r/leagueoflegends",
        "r/blackops4",
        "r/casualconversation",
        "r/creepyasterisks",
        "r/pcgaming",
        "r/gadgets",
        "r/warhammer",
        "r/transcribersofreddit",
        "r/muse",
        "r/mademesmile",
        "r/lifeprotips",
        "r/instant_regret",
        "r/choosingbeggars",
        "r/facepalm",
        "r/learnprogramming",
        "r/fuckthealtright",
        "r/dataisbeautiful",
        "r/hmmm",
        "r/fantheories",
        "r/haiku",
        "r/linux",
        "r/thathappened",
        "r/bostonceltics",
        "r/funny",
        "r/wowthanksimcured",
        "r/subredditsastext",
        "r/motorcycles",
        "r/callofduty",
        "r/patientgamers",
        "r/casualchildabuse",
        "r/goblinslayer",
        "r/stardustcrusaders",
        "r/bestoflegaladvice",
        "r/books",
        "r/csgo",
        "r/thedivision",
        "r/nosleep",
        "r/soccer",
        "r/elitedangerous",
        "r/cardinals",
        "r/whatcouldgowrong",
        "r/moviedetails",
        "r/vaxxhappened",
        "r/spaceengineers",
        "r/learnjapanese",
        "r/leagueofmeta",
        "r/formula1",
        "r/weekendgunnit",
        "r/savedyouaclick",
        "r/atetheonion",
        "r/minecraft",
        "r/popheads",
        "r/chicagobulls",
        "r/wisconsin",
        "r/apple",
        "r/engrish",
        "r/insanepeoplefacebook"
    ];

    return bannedSubs.includes(subName.toLowerCase());
}

function trimLongComment(comment){
    if(comment.length > 9500){
        comment = comment.substring(0,9500);
    }
    return comment;
}
