require('dotenv').config();

const Snoowrap = require('snoowrap');
const Snoostorm = require('snoostorm');
const thesaurus = require('thesaurus');
const pluralize = require('pluralize');

const globalCallWord = "!thesaurizethis";
const fandango = "!dothefandango";
const commonArr =["the","of","and","a","to","in","is","you","that","it","he","was","for","on","are","as","with","his","they","I","at","be","this","have","from","or","one","had","by","word","but","not","what","all","were","we","when","your","can","said","there","use","an","each","which","she","do","how","their","if","will","up","about","out","many","then","them","these","so","some","her","would","make","like","him","into","time","has","look","two","more","go","see","no","way","could","my","than","been","call","who","its","now","did","get","come","made","may","part","i","me","his"];
const limitedPosts = {};

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
    results: 200,
    pollTime: 2500
};
  
// Create a Snoostorm CommentStream with the specified options
const comments = client.CommentStream(streamOpts);

// On comment, perform whatever logic you want to do
comments.on('comment', async (comment) => {

    if (containsCallWord(comment, globalCallWord) || containsCallWord(comment, fandango)){
//        console.log(comment);
        let parentComment = await r.getComment(comment.parent_id).body;
        
        if(parentComment){
            processComment(comment, parentComment);
        }
    
    } else if(comment.subreddit_name_prefixed === "r/ThesaurizeThis" && comment.author.name !== "ThesaurizeThisBot"){
        processComment(comment, false);
    }
});

function processComment(comment, parentComment){
    let commentToProcess = parentComment ? parentComment : comment.body;
    commentToProcess = commentToProcess.split(`

***

`)[0];
    let insanity = thesaurize(commentToProcess);
    if(containsCallWord(comment, fandango)){
        for(let i = 0; i < 10; i++){
            insanity = thesaurize(insanity);
        }
    }
    console.log("~~~~~~~~~~~~~");
    console.log(comment.subreddit_name_prefixed);
    console.log(insanity);
    if(inBannedSub(comment.subreddit_name_prefixed)){
        bannedReply(insanity, comment.author.name, comment.subreddit_name_prefixed, comment.permalink);
    } else if(limitedSubLimitReached(comment)){
        limitedReply(insanity, comment.author.name, comment.subreddit_name_prefixed, comment.permalink);
    } else {
        comment.reply(insanity + subScript());
    }
}

function containsCallWord(comment, callWord){
    return comment.body.toLowerCase().includes(callWord);
}
  
function thesaurize(comment){
    let wordArr = comment.split(' ');
    let insanity = wordArr.map(word => {
        if(word.toLocaleLowerCase().includes(globalCallWord)){
            return "ThesaurizeThisBot is the bestest ever";
        }
        let punctuation;
        let isPlural = false;
        let split = splitPunctuation(word);
        word = split.word;
        punctuation = split.punctuation;
        if(commonArr.includes(word.toLowerCase())){
            return constructWord(word, punctuation);
        }
        
        let capitalize = word.charAt(0) === word.charAt(0).toUpperCase();
        let allCaps = word === word.toUpperCase();
        if(pluralize.isPlural(word) && !word.includes(`'s`)){
            isPlural = true;
            word = pluralize.singular(word.toLowerCase());
        }
        
        
        
        if(word.toLocaleLowerCase() === "trump" || word.toLocaleLowerCase() === "trump's"){
            return constructWord(trump(), punctuation, false, capitalize, allCaps);
        }
        
        let returnWord = getThesaurusWord(word);
        
        return constructWord(returnWord, punctuation, isPlural, capitalize, allCaps);
    });
    
    insanity = insanity.join(' ');
    return trimLongComment(insanity);
}

function getThesaurusWord(word){
    let tWordArr = thesaurus.find(word.toLowerCase());
    let tWord = chooseWord(tWordArr);
    return tWord ? tWord : word;
}

function constructWord(word, punctuation, isPlural, capitalize, allCaps){
    if(isPlural){
        word = pluralize.plural(word);
    }
    if(allCaps){
        word = word.toUpperCase();
    } else if(capitalize){
        word = jsUcfirst(word);
    }
    return punctuation[0] + word + punctuation[1];
}

function splitPunctuation(word){
    let returnObj = {
        word,
        punctuation: ["",""]
    };
    while(!isLetter(returnObj.word[returnObj.word.length -1]) && returnObj.word.length){
        returnObj.punctuation[1] = returnObj.word.substring(returnObj.word.length-1) + returnObj.punctuation[1];
        returnObj.word = returnObj.word.substring(0, returnObj.word.length-1);
    }
    
    while(!isLetter(returnObj.word[0]) && returnObj.word.length){
        returnObj.punctuation[0] = returnObj.punctuation[0] + returnObj.word.substring(0,1);
        returnObj.word = returnObj.word.substring(1);
    }
    
    return returnObj;
}

function subScript(customText){
    let baseMessage = "^(This is a bot. I try my best, but my best is 80% mediocrity 20% hilarity. Created by OrionSuperman. Check out my best work at /r/ThesaurizeThis)";
    let message = customText || baseMessage;
    return `

***

${message}`;
}

function chooseWord(tWordArr){
    return tWordArr.length ? tWordArr[Math.floor(Math.random()*tWordArr.length)] : false;
}

function isLetter(c) {
  return c ? c.toLowerCase() != c.toUpperCase() : true;
}

function jsUcfirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function inLimitedSubs(subName){
    let limitedSubs = {
        "r/testingground4bots": 10,
        "r/test": 4
    }

    return limitedSubs[subName];
}

function limitedSubLimitReached(comment){
    
    let subLimit = inLimitedSubs(comment.subreddit_name_prefixed);
    if(!subLimit){
        return false;
    }
    let submissionID = comment.link_id;
    limitedPosts[submissionID] = limitedPosts[submissionID] + 1 || 1;
    
    return limitedPosts[submissionID] > subLimit;
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
        "r/learnprogramming"
    ];
    
    return bannedSubs.includes(subName.toLowerCase());
}

function bannedReply(insanity, user, subreddit, commentLink){
    let bannedResponse = `Paging u/${user}. [You called](${commentLink}), unfortunately I am banned in ${subreddit} so here is your translated text.`;
    r.getSubmission('9y3efk').reply(insanity + subScript(bannedResponse));
}

function limitedReply(insanity, user, subreddit, commentLink){
    let limitedResponse = `Paging u/${user}. [You called](${commentLink}), but the mods of ${subreddit} have limited the number of times I can be used per post. Here is your translated text.`;
    r.getSubmission('9y3efk').reply(insanity + subScript(limitedResponse));
}

function trimLongComment(comment){
    if(comment.length > 9500){
        comment = comment.substring(0,9500);
    }
    return comment;
}

function trump() {
    let trumpNames = `Agent of Deranged Change
The Angry Cheeto
Bag of Toxic Sludge
Bald-faced Crier
The Bigoted Billionaire
The Bilious Billionaire
Blowhard
The Bouffant Buffoon
Bush Baby and Bush Baby Fingers
The Bush Basher
The Bush Beater
Bushmaster
Captain Bluster
Captain Crunch
Captain Tantastic
Chimp-PAN-Zee
Clown Prince of Politics
The Combover Con Artist
Commander-in-Grief
Conspiracy Commander-in-Chief
Con-Dike Gold Rush
Crown Prince of Politwits
Crybaby Prima Donald
The Daft Draft Dodger
Dainty Donald
The Debate Hater
Deeply Disturbed Fuzzy Orange Goofball
Der Groepenfuehrer
Der Trumpkopf
Dickhead
Dickhead Dongle
Dingbat Donald
Dishonest Don
The Disruptor
The Dick Tater
Dodgy Donald
Don the Con
Don Dementia
Donald Chump
Donald deGonad
Donald Dingbat
Donald Dipshit
The Donaldmeister
Donald Doom
The Donimator
Donald Douche and the Bags
Donald Duck
Donald Duck Doo-Doo
Donald Ducknuke
Donald Dump
Donald Gonad
Donald the Menace
Don Goner
Donnie Bratso
Donnie Darko
Donnie TicTac
Donnybaby
Donnyboy
Donnybrook
Don of Orange
Dr. Strangelove
Duke Nuke ‘Em
Dumbelldore
Ego Maniac
The Emperor with no Clothes
Itty Bitty Ball Trump
The Fanta Fascist
Field Marshall Trump
Flipper
Flip Flopper
The Fomentalist
Forrest Trump
The Fraud of Fifth Avenue
Frisker-in-Chief
Frisky Frisker
The Frontrunner
Golden Calf of Doom
God-Emperor Trump
Great Orange Hairball of Fear
The Great White Dope
The Great White Dope on a Self-Hanging Rope
Grope Dope
Halfwit Tweet Twit
Head Twit
Herr Führer Trump
Herr Trump
The Human Amplifier
The Human Combover
The Human Tanning Bed Warning Label
The im-POTUS
The Inane Interjector
The Infuriator
The ISIS Candidate
Jack the Gripper
King of Debt
King Leer
King of Sleaze
King of Spin
King Trump
King Twit
K-Mart Caesar
Last of The Mango Mohawkans
Liberal Lip
Little Donnie Sissypants
Little Dutch Boy
The Lone DeRanger
Long Dong Trump
Lurch
The Lyin King
Macho McGrump
The Mad Shambler
Mango Mussolini
Master Debater
MEGA-low-maniac
Mr. Firepants
Mr. Inappropriate
Mr. Boinker Oinker
New York Dork
Orange Bozo
Orange Caligula
Orange Clown
Orange-Hued Self-Immolator
Orange Man
The Orange Messiah
Orange Moron
Orange Omen of Doom
Orange Toilet Bowl Crud Brought to Life as a Genital-Grabbing Golem
Orange-Tufted Imbecile Intent on Armageddon
Orange-Tufted Asshole
OranguTAN
Party Pooper
President Gold Man Sucks
President If-Urine-You’re-In
President Rancid Velveeta
Prima Donald
Pudgy McTrumpcake
Puffed Up Daddy
Pussy Posse
Putin’s Papaya-Flavored Pawn
Putin’s Pet
Queer Orangutan
Republican Rapture Inducer
Ryan’s Nope
Scrooge McTrump
Sexual-Predator-in-Chief
Shitler
Sir Sissypants
The Spin King
The Suicide Bummer
The Swamp Draining Lizard-Man-Toddler
The Talking Yam
The Tanning Bed Warning Label
Tangerine Jesus
Tepid Trumpeter
Thin Skinned Orange Peel
Tic-Tacky Trump
Timid Trumpster
Tiny Hands Trump
Tricky Trump
T-Rump
Trumpalump
Trumpamaniac
Trump Card
Trumpledore
Trumpletoes
Trumpling Dildo
Trumpmeister
Trumpster
Trumpthechumps
Trumpty Dumpty
Trump the Grump
The Tufted Taliban
Twat Twit
Twitter Flitter
Twitter Spitter
The UNA Bomber
Unreality King
Venom-Drenched Regurgitated Slimy Orange Hairball
Walking Punchline
Whiny Don
Whiny Donald
The White Pride Piper
YUGE Asshole
YUGE Liar
Zen Master of Hate`.split("\n");
    return trumpNames[Math.floor(Math.random()*trumpNames.length)]
}