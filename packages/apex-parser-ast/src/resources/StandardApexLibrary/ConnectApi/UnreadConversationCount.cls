/**
 * Unread count for a conversation.
 */
global class UnreadConversationCount {

  global UnreadConversationCount() {}

  /**
   * Specifies if there are more than 50 unread messages ( true ) or not ( false ).
   */
  global Boolean hasMore;

  /**
   * The total number of unread messages.
   */
  global Integer unreadCount;

  global Object clone() {}

}