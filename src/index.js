let thesaurize = require('thesaurize');
let os = require('os');

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

/**
 * determines if a comment meets the criteria for processing
 * @param comment
 * @param listener
 * @returns {Promise<void>}
 */
async function checkComment(comment, listener) {
    replyBot = listener;
    if (await commentMeetsCriteria(comment)) {
        let callWords = containsCallWord(comment);
        if (callWords.length) {
            await processCallWordComment(comment);
        } else if (comment.subreddit_name_prefixed === "r/ThesaurizeThis") {
            await processAutoReplyComment(comment);
        }
    }
}

/**
 * Does not look for call words in comments made by the bot or previously scanned comments
 * @param comment
 * @returns {Promise<boolean>}
 */
async function commentMeetsCriteria(comment) {
    return comment.author.name !== "ThesaurizeThisBot"
        && !(await inCommentHistory(comment));
}

/**
 * returns an array of all callwords detected in a comment
 * @param comment
 * @returns {*[]}
 */
function containsCallWord(comment) {
    return globalCallWords.filter(callWord => {
        let re = new RegExp(callWord, "i");
        return comment.body.match(re);
    });
}

/**
 * processes the parent comment of the comment where the call word was detected
 * @param comment
 * @returns {Promise<void>}
 */
async function processCallWordComment(comment) {
    let parentCommentBody = await replyBot.getComment(comment.parent_id).body;
    let commentBody = parentCommentBody || comment.body;
    processComment(comment, commentBody);
}

/**
 * processes the comment that was made in a sub where automatic replies are enabled.
 * @param comment
 * @returns {Promise<void>}
 */
async function processAutoReplyComment(comment) {
    let commentBody = await comment.body;
    processComment(comment, commentBody);
}

/**
 * determines if any of the bot listeners have inspected the comment before
 * @param comment
 * @returns {Promise<boolean>}
 */
async function inCommentHistory(comment) {
    let inHistory = false;
    let commentID = await comment.id;
    if (!commentHistory.includes(commentID)) {
        commentHistory.push(commentID);
    } else {
        inHistory = true;
    }

    if (commentHistory.length > 250) {
        commentHistory.shift();
    }

    return inHistory;
}

/**
 * runs the commentText through the thesaurizer, stripping post script text and calling the reply function
 * @param comment
 * @param commentText
 * @returns {Promise<void>}
 */
async function processComment(comment, commentText) {
    let insanity = thesaurize(removeSubscript(commentText), {customThesaurus: callWordThesaurus});
    logComment(comment, insanity);
    replyToComment(insanity, comment);
}

/**
 * determines how the bot will reply, either directly or in the dedicated post
 * @param insanity
 * @param comment
 */
function replyToComment(insanity, comment) {
    if (inBannedSub(comment.subreddit_name_prefixed)) {
        bannedReply(insanity, comment.author.name, comment.subreddit_name_prefixed, comment.permalink);
    } else if (limitedSubLimitReached(comment)) {
        limitedReply(insanity, comment.author.name, comment.subreddit_name_prefixed, comment.permalink);
    } else {
        let replyText = trimLongComment(insanity) + subScript();
        commentReply(comment, replyText)
    }
}

/**
 * removes the subscript the bot adds to all posts. This allow for chaining.
 * @param commentText
 * @returns {*|string}
 */
function removeSubscript(commentText) {
    return commentText.split(`\n\n***\n\n`)[0];
}

/**
 * posts the reply to the comment with the modified text.
 * @param comment
 * @param reply
 * @returns {Promise<void>}
 */
async function commentReply(comment, reply) {
    try {
        if (comment.author.name === "OrionSuperman") {
            reply += generateDebug();
        }
        await comment.reply(reply);
    } catch (err) {
        console.error(err);
    }

}

/**
 * custom response in a dedicated post if the bot is called in a banned subreddit.
 * @param insanity
 * @param user
 * @param subreddit
 * @param commentLink
 */
function bannedReply(insanity, user, subreddit, commentLink) {
    let bannedResponse = `^Paging ^u/${user}. [^Thank ^you ^for ^calling](${commentLink}), ^unfortunately ^I ^am ^banned ^in ^${subreddit.substring(1, subreddit.length)}, ^so ^please ^enjoy ^your ^translated ^text.`;
    try {
        replyBot.getSubmission('9y3efk').reply(trimLongComment(insanity) + subScript(bannedResponse));
    } catch (err) {
        console.error(err);
    }

}

/**
 * custom response in a dedicated post if the bot has reached subreddit specific limits
 * @param insanity
 * @param user
 * @param subreddit
 * @param commentLink
 */
function limitedReply(insanity, user, subreddit, commentLink) {
    let subLimits = inLimitedSubs(subreddit);
    let limitedResponse = `^Paging ^u/${user}. [^Thank ^you ^for ^calling](https://reddit.com${commentLink}). ^To ^keep ^spam ^down, ^${subreddit} ^mods ^have ^requested ^I ^limit ^my ^responses ^to ^${subLimits.postLimit} ^per ^post, ^${subLimits.userLimit} ^per ^user. ^But ^don't ^fret, ^you ^can ^continue ^thesaurizing ^in ^this ^post.`;
    try {
        replyBot.getSubmission('9y3efk').reply(trimLongComment(insanity) + subScript(limitedResponse));
    } catch (err) {
        console.error(err);
    }
}

/**
 * returns the subscript for the bot.
 * @param customText
 * @returns {string}
 */
function subScript(customText) {
    let baseMessage = "^(This is a bot. I try my best, but my best is 80% mediocrity 20% hilarity. Created by OrionSuperman. Check out my best work at /r/ThesaurizeThis)";
    let message = customText || baseMessage;
    return `\n\n***\n\n${message}`;
}

/**
 * returns if the sub is a limited sub
 * @param subName
 * @returns {*}
 */
function inLimitedSubs(subName) {
    let limitedSubs = {
        "r/copypasta": {
            "postLimit": 10,
            "userLimit": 2
        }
    };

    return limitedSubs[subName];
}

/**
 * determines if the subreddit limit has been reached on either a per post or per user basis
 * @param comment
 * @returns {boolean}
 */
function limitedSubLimitReached(comment) {

    let subLimitValues = inLimitedSubs(comment.subreddit_name_prefixed);
    if (!subLimitValues) {
        return false;
    }
    let submissionID = comment.id;
    limitedPosts[submissionID] = limitedPosts[submissionID] || {};
    limitedPosts[submissionID].postCount = limitedPosts[submissionID].postCount + 1 || 1;
    limitedPosts[submissionID][comment.author.name] = limitedPosts[submissionID][comment.author.name] + 1 || 1;
    let underPostLimit = limitedPosts[submissionID].postCount <= subLimitValues.postLimit;
    let underUserLimit = limitedPosts[submissionID][comment.author.name] <= subLimitValues.userLimit;

    return underPostLimit && underUserLimit;
}

/**
 * determines if the callword was used in a banned sub
 * @param subName
 * @returns {*}
 */
function inBannedSub(subName) {
    return bannedSubs.includes(subName.toLowerCase());
}

/**
 * reddit has a character count max of 10,000. With the word substitutions, it can often increase the length of already long comments past the threshhold. This trims the comment to ensure it is able to be posted.
 * @param comment
 * @returns {*}
 */
function trimLongComment(comment) {
    if (comment.length > 9500) {
        comment = comment.substring(0, 9500);
    }
    return comment;
}

/**
 * logs the comment for ease of debugging and monitoring the tail of the log for activity
 * @param comment
 * @param insanity
 */
function logComment(comment, insanity){
    console.log("~~~~~~~~~~~~~");
    console.log(comment.subreddit_name_prefixed);
    console.log(insanity);
    console.log("~~~~~~~~~~~~~");
}

/**
 * short term debug stats only added to responses of the bots creator
 * @returns {string}
 */
function generateDebug() {
    cpuCount = os.cpus().length;
    let minAvg = os.loadavg()[2];
    return ` ^CPU ^Count: ^${cpuCount}. ^Running ^average ^usage: ^${minAvg}`;
}

module.exports = checkComment;