/**
 * If a feed element has this capability, it has a question and comments on the feed element are answers to the question.
 */
global class QuestionAndAnswersCapability {

  /**
   * Comment selected as the best answer for the question.
   */
  global ConnectApi.Comment bestAnswer;

  /**
   * User who selected the best answer for the question.
   */
  global ConnectApi.UserSummary bestAnswerSelectedBy;

  /**
   * Indicates whether the context user can select or remove a best answer ( true ) or not ( false ).
   */
  global Boolean canCurrentUserSelectOrRemoveBestAnswer;

  /**
   * Status of candidate answers for the question.
   */
  global ConnectApi.CandidateAnswersStatus candidateAnswers;

  /**
   * If a question post is escalated, this is the case to which it was escalated.
   */
  global ConnectApi.Reference escalatedCase;

  /**
   * Title for the question.
   */
  global String questionTitle;

}