/**
 * Create or edit a question feed element or set the best answer of the existing question feed element.
 */
global class QuestionAndAnswersCapabilityInput {

  /**
   * A comment ID to use as a best answer for a question feed element. The best answer comment must already exist on the question feed element.
   */
  global String bestAnswerId;

  /**
   * Title for a question feed element. To edit the title of a question, use updateFeedElement(communityId, feedElementId, feedElement) . Editing question titles is supported in version 34.0 and later.
   */
  global String questionTitle;

}