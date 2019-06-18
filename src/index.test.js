const _ = require("lodash");
const rewire = require("rewire");
const chai = require("chai");
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require("sinon-chai");

chai.use(sinonChai);


describe("index.js", () => {
    let index;

    beforeEach(() => {
        index = rewire('./');
    });

    describe("checkComment()", () => {
        let checkComment,
            comment,
            listener,
            commentMeetsCriteriaStub,
            containsCallWordStub,
            processCallWordCommentStub,
            processAutoReplyCommentStub;

        beforeEach(() => {
            checkComment = index.__get__("checkComment");
            comment = {
                "subreddit_name_prefixed": "r/test"
            };
            listener = "I'm a function that should be assigned to global variable replyBot";

            processCallWordCommentStub = sinon.stub();
            processAutoReplyCommentStub = sinon.stub();

            index.__set__({
                "processCallWordComment": processCallWordCommentStub,
                "processAutoReplyComment": processAutoReplyCommentStub
            });
        });

        it("sets global variable of replyBot to passed in listener", async () => {
            commentMeetsCriteriaStub = sinon.stub().returns(false);
            index.__set__({"commentMeetsCriteria": commentMeetsCriteriaStub});

            await checkComment(comment, listener);

            let replyBot = index.__get__("replyBot");
            expect(replyBot).to.eql(listener);
        });

        it("calls processCallWordComment() if it meets criteria and contains callword", async () => {
            commentMeetsCriteriaStub = sinon.stub().returns(true);
            containsCallWordStub = sinon.stub().returns(["yep"]);
            index.__set__({
                "commentMeetsCriteria": commentMeetsCriteriaStub,
                "containsCallWord": containsCallWordStub
            });

            await checkComment(comment, listener);

            expect(commentMeetsCriteriaStub).to.have.been.calledWith(comment);
            expect(containsCallWordStub).to.have.been.calledWith(comment);
            expect(processCallWordCommentStub).to.have.been.calledWith(comment);
            expect(processAutoReplyCommentStub).to.have.not.been.called;
        });

        it("calls processAutoReplyComment() if the comment was made in r/ThesaurizeThis", async () => {
            comment.subreddit_name_prefixed = "r/ThesaurizeThis";

            commentMeetsCriteriaStub = sinon.stub().returns(true);
            containsCallWordStub = sinon.stub().returns([]);
            index.__set__({
                "commentMeetsCriteria": commentMeetsCriteriaStub,
                "containsCallWord": containsCallWordStub
            });

            await checkComment(comment, listener);

            expect(processCallWordCommentStub).to.have.not.been.called;
            expect(processAutoReplyCommentStub).to.have.been.calledWith(comment);
        });

        it("calls no functions if the comment does not meet criteria", async () => {
            commentMeetsCriteriaStub = sinon.stub().returns(false);
            containsCallWordStub = sinon.stub().returns([]);
            index.__set__({
                "commentMeetsCriteria": commentMeetsCriteriaStub,
                "containsCallWord": containsCallWordStub
            });

            await checkComment(comment, listener);

            expect(commentMeetsCriteriaStub).to.have.been.calledWith(comment);
            expect(containsCallWordStub).to.have.not.been.called;
            expect(processCallWordCommentStub).to.have.not.been.called;
            expect(processAutoReplyCommentStub).to.have.not.been.called;
        });
    });

    describe("commentMeetsCriteria()", () => {
        let commentMeetsCriteria,
            comment,
            inCommentHistoryStub;

        beforeEach(() => {
            commentMeetsCriteria = index.__get__("commentMeetsCriteria");
            comment = {
                "author": {
                    "name": "OrionSuperman"
                }
            };

            inCommentHistoryStub = sinon.stub().resolves(false);
        });

        it("returns true if comment is not authored by the bot, and not in the history", async () => {
            index.__set__("inCommentHistory", inCommentHistoryStub);

            let result = await commentMeetsCriteria(comment);
            expect(result).to.eql(true);
            expect(inCommentHistoryStub).to.have.been.calledWith(comment);
        });

        it("returns false if comment is made by the bot", async () => {
            comment.author.name = "ThesaurizeThisBot";
            index.__set__("inCommentHistory", inCommentHistoryStub);

            let result = await commentMeetsCriteria(comment);
            expect(result).to.eql(false);
            expect(inCommentHistoryStub).to.have.not.been.called;
        });

        it("returns false if comment is in the comment history", async () => {
            inCommentHistoryStub = sinon.stub().resolves(true)
            index.__set__("inCommentHistory", inCommentHistoryStub);

            let result = await commentMeetsCriteria(comment);
            expect(result).to.eql(false);
            expect(inCommentHistoryStub).to.have.been.calledWith(comment);
        });
    });

    describe("containsCallWord()", () => {
        let containsCallWord,
            comment,
            globalCallWords;

        beforeEach(() => {
            containsCallWord = index.__get__("containsCallWord");
            comment = {
                "body": "there is a !PotentialCallWord in this string"
            };
        });

        it("returns array of any of the global call words present in the input comment", () => {
            globalCallWords = ["!NotInThisComment", "!PotentialCallWord"];
            index.__set__("globalCallWords", globalCallWords);

            let result = containsCallWord(comment);

            expect(result).to.eql([globalCallWords[1]]);
        });

        it("returns empty array if there are no global call words present", () => {
            globalCallWords = ["!NotInThisComment", "!AlsoNotInThisComment"];
            index.__set__("globalCallWords", globalCallWords);

            let result = containsCallWord(comment);

            expect(result).to.eql([]);
        });
    });

    describe("processCallWordComment()", () => {
        let processCallWordComment,
            comment,
            replyBotGetCommentStub,
            replyBotGetCommentReturn,
            processCommentStub;

        beforeEach(() => {
            processCallWordComment = index.__get__("processCallWordComment");
            comment = {
                "parent_id": "barbosa",
                "body": "took the black pearl"
            };

            processCommentStub = sinon.stub();
            index.__set__("processComment", processCommentStub);
        });

        it("uses parent comment body when present", async () => {
            replyBotGetCommentReturn = {
                "body": "Jack Sparrow"
            };
            replyBotGetCommentStub = sinon.stub().returns(replyBotGetCommentReturn);
            index.__set__("replyBot", {
                "getComment": replyBotGetCommentStub
            });

            await processCallWordComment(comment);
            expect(replyBotGetCommentStub).to.have.been.calledWith(comment.parent_id);
            expect(processCommentStub).to.have.been.calledWith(comment, replyBotGetCommentReturn.body)
        });

        it("uses the comment.body when parent comment is not present", async () => {
            replyBotGetCommentReturn = {};
            replyBotGetCommentStub = sinon.stub().returns(replyBotGetCommentReturn);
            index.__set__("replyBot", {
                "getComment": replyBotGetCommentStub
            });

            await processCallWordComment(comment);
            expect(replyBotGetCommentStub).to.have.been.calledWith(comment.parent_id);
            expect(processCommentStub).to.have.been.calledWith(comment, comment.body)
        });
    });
});