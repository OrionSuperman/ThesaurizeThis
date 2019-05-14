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


});