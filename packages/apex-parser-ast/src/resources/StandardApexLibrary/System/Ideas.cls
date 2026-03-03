/**
 * Represents zone ideas.
 */
global class Ideas {

  /**
   * Returns a list of similar ideas based on the title of the specified idea.
   * @param idea 
   * @return ID []
   */
  public static ID [] findSimilar(Idea idea) {}

  /**
   * Returns ideas that have recent replies for the specified user or zone. This includes all read and unread replies.
   * @param userID 
   * @param communityID 
   * @return ID []
   */
  public static ID [] getAllRecentReplies(String userID, String communityID) {}

  /**
   * Returns ideas that have recent replies marked as read.
   * @param userID 
   * @param communityID 
   * @return ID []
   */
  public static ID [] getReadRecentReplies(String userID, String communityID) {}

  /**
   * Returns ideas that have recent replies marked as unread.
   * @param userID 
   * @param communityID 
   * @return ID []
   */
  public static ID [] getUnreadRecentReplies(String userID, String communityID) {}

  /**
   * Marks all comments as read for the user that is currently logged in.
   * @param ideaID 
   */
  public static void markRead(String ideaID) {}

}