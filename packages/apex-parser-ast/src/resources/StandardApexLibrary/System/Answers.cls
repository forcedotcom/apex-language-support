/**
 * Represents zone answers.
 * Usage
 * Answers is a feature that enables users to ask questions and have zone members post replies. Members can then vote on the helpfulness of each reply, and the person who asked the question can mark one reply as the best answer.
 * For more information on answers, see “Answers Overview” in the Salesforce online help.
 * Example
 * The following example finds questions in an internal zone that have similar titles as a new question:
 * public class FindSimilarQuestionController {
 *
 *    public static void test() {
 *    // Instantiate a new question
 *    Question question = new Question ();
 *
 *    // Specify a title for the new question
 *    question.title = 'How much vacation time do full-time employees get?';
 *
 *    // Specify the communityID (INTERNAL_COMMUNITY) in which to find similar questions.
 *    Community community = [ SELECT Id FROM Community WHERE Name = 'INTERNAL_COMMUNITY' ];
 *
 *    question.communityId = community.id;
 *
 *    ID[] results = Answers.findSimilar(question);
 *    }
 * }
 *
 * The following example marks a reply as the best reply:
 * ID questionId = [SELECT Id FROM Question WHERE Title = 'Testing setBestReplyId' LIMIT 1].Id;
 * ID replyID = [SELECT Id FROM Reply WHERE QuestionId = :questionId LIMIT 1].Id;
 * Answers.setBestReply(questionId,replyId);
 */
global class Answers {
    global Answers() { }

    global virtual Boolean equals(Object o) { return false; }

    global static List findSimilar(SObject question) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the specified reply for the specified question as the best reply. Because a question can have multiple replies, setting the best reply helps users quickly identify the reply that contains the most helpful information.
     */
    global static void setBestReply(String questionId, String bestReplyId) { }

    global override virtual String toString() { return null; }
}