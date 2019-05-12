let thesaurize = require('thesaurize');

let thesaurizethis = "!thesaurizethis";
let fandango = "!dothefandango";
let globalCallWords = [thesaurizethis];
let bannedSubs = require("../data/bannedSubs.json");

let loopPrevention = "ThesaurizeThisBot is the bestest ever";
let callWordThesaurus = {
    [thesaurizethis]: [loopPrevention],
    [fandango]: [loopPrevention]
};
let limitedPosts = {};
let commentHistory = [];

let replyBot;

async function checkComment(comment, listener){
    replyBot = listener;
    if(comment.author.name !== "ThesaurizeThisBot" && ! await inCommentHistory(comment)){
        let commentBody;
        let callWords = containsCallWord(comment);
        if (callWords.length){
            let parentComment = await replyBot.getComment(comment.parent_id).body;
            commentBody = parentComment || comment.body;
            processComment(comment, commentBody, callWords);
        } else if(comment.subreddit_name_prefixed === "r/ThesaurizeThis"){
            commentBody = await comment.body;
            processComment(comment, commentBody, callWords);
        }
        
    }
}

async function inCommentHistory(comment){
    let inHistory = false;
    if(!commentHistory.includes(await comment.id)){
        commentHistory.push(await comment.id);
        if(commentHistory.length > 250){
            commentHistory.shift();
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
        reply(comment, replyText)
    }
}

async function reply(comment, reply){
    try{
        await comment.reply(reply);
    } catch (err){
        console.error(err);
    }

}

function bannedReply(insanity, user, subreddit, commentLink){
    let bannedResponse = `^Paging ^u/${user}. [^Thank ^you ^for ^calling](${commentLink}), ^unfortunately ^I ^am ^banned ^in ^${subreddit.substring(1, subreddit.length)}, ^so ^please ^enjoy ^your ^translated ^text.`;
    try{
        replyBot.getSubmission('9y3efk').reply(insanity + subScript(bannedResponse));
    } catch(err) {
        console.error(err);
    }

}

function limitedReply(insanity, user, subreddit, commentLink){
    let subLimits = inLimitedSubs(subreddit);
    let limitedResponse = `^Paging ^u/${user}. [^Thank ^you ^for ^calling](https://reddit.com${commentLink}). ^To ^keep ^spam ^down, ^${subreddit} ^mods ^have ^requested ^I ^limit ^my ^responses ^to ^${subLimits.postLimit} ^per ^post, ^${subLimits.userLimit} ^per ^user. ^But ^don't ^fret, ^you ^can ^continue ^thesaurizing ^in ^this ^post.`;
    try {
        replyBot.getSubmission('9y3efk').reply(insanity + subScript(limitedResponse));
    } catch(err){
        console.error(err);
    }
}

function containsCallWord(comment){

    return globalCallWords.filter( callWord => {
        var re = new RegExp(callWord,"i");
        return comment.body.match(re);
    });

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
    return bannedSubs.includes(subName.toLowerCase());
}

function trimLongComment(comment){
    if(comment.length > 9500){
        comment = comment.substring(0,9500);
    }
    return comment;
}

module.exports = checkComment;