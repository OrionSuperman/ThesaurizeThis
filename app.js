require('dotenv').config();

const Snoowrap = require('snoowrap');
const Snoostorm = require('snoostorm');
const thesaurus = require('thesaurus');

const commonArr =["the","of","and","a","to","in","is","you","that","it","he","was","for","on","are","as","with","his","they","I","at","be","this","have","from","or","one","had","by","word","but","not","what","all","were","we","when","your","can","said","there","use","an","each","which","she","do","how","their","if","will","up","other","about","out","many","then","them","these","so","some","her","would","make","like","him","into","time","has","look","two","more","write","go","see","number","no","way","could","people","my","than","first","water","been","call","who","oil","its","now","find","long","down","day","did","get","come","made","may","part","i","me"];


// Build Snoowrap and Snoostorm clients
const r = new Snoowrap({
    userAgent: 'thesaurize-this',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS
});
const client = new Snoostorm(r);

// Configure options for stream: subreddit & results per query
const streamOpts = {
    subreddit: 'all',
    results: 400,
    pollTime: 2000
};
  
// Create a Snoostorm CommentStream with the specified options
const comments = client.CommentStream(streamOpts);

// On comment, perform whatever logic you want to do
comments.on('comment', async (comment) => {

    if (comment.body.includes('!ThesaurizeThis') ||
        comment.body.includes('!thesaurizethis') ||
        comment.body.includes('!Thesaurizethis')
       ){
        let parentComment = await r.getComment(comment.parent_id).body;
        if(parentComment){
            let insanity = thesaurize(parentComment);
            console.log("~~~~~~~~~~~~~");
            console.log(insanity);
            comment.reply(insanity);
        }
    }
});
  
function thesaurize(comment){
    let wordArr = comment.split(' ');
    let insanity = wordArr.map(word => {
        if(commonArr.includes(word.toLowerCase())){
            return word;
        }
        let capitalize = word.charAt(0) === word.charAt(0).toUpperCase();
        let tWordArr = thesaurus.find(word.toLowerCase());
        let tWord = chooseWord(tWordArr);
        let returnWord = tWord ? tWord : word;
        returnWord = capitalize ? jsUcfirst(returnWord) : returnWord;
        return returnWord;
    });
    
    return insanity.join(' ');
}

function chooseWord(tWordArr){
    return tWordArr.length ? tWordArr[Math.floor(Math.random()*tWordArr.length)] : false;
}

function jsUcfirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}