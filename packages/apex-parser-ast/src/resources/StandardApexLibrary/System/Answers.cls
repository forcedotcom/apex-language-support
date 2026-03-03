/**
 * Represents zone answers.
 */
global class Answers {

  /**
   * Returns a list of similar questions based on the title of the specified question.
   * @param yourQuestion 
   * @return ID []
   */
  public static ID [] findSimilar(Question yourQuestion) {}

  /**
   * Sets the specified reply for the specified question as the best reply. Because a question can have multiple replies, setting the best reply helps users quickly identify the reply that contains the most helpful information.
   * @param questionId 
   * @param replyId 
   */
  public static void setBestReply(String questionId, String replyId) {}

}