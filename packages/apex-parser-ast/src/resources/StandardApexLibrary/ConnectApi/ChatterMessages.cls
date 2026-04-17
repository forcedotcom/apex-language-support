/**
 * Get, send, search, and reply to private messages. You can also get and search private conversations, mark conversations as read, and get a count of unread private messages.
 */
global class ChatterMessages {

  public static ConnectApi.ChatterConversation getConversation(String conversationId) {}

  public static ConnectApi.ChatterConversation getConversation(String conversationId, String pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterConversation getConversation(String communityId, String conversationId) {}

  public static ConnectApi.ChatterConversation getConversation(String communityId, String conversationId, String pageParam, String pageSize) {}

  public static ConnectApi.ChatterConversationPage getConversations() {}

  public static ConnectApi.ChatterConversationPage getConversations(String pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterConversationPage getConversations(String communityId) {}

  public static ConnectApi.ChatterConversationPage getConversations(String communityId, String pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterMessage getMessage(String messageId) {}

  public static ConnectApi.ChatterMessage getMessage(String communityId, String messageId) {}

  public static ConnectApi.ChatterMessagePage getMessages() {}

  public static ConnectApi.ChatterMessagePage getMessages(String pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterMessagePage getMessages(String communityId) {}

  public static ConnectApi.ChatterMessagePage getMessages(String communityId, String pageParam, Integer pageSize) {}

  public static ConnectApi.UnreadConversationCount getUnreadCount() {}

  public static ConnectApi.UnreadConversationCount getUnreadCount(String communityId) {}

  public static ConnectApi.ChatterConversationSummary markConversationRead(String conversationId, Boolean read) {}

  public static ConnectApi.ChatterConversationSummary markConversationRead(String communityId, String conversationID, Boolean read) {}

  public static ConnectApi.ChatterMessage replyToMessage(String text, String inReplyTo) {}

  public static ConnectApi.ChatterMessage replyToMessage(String communityId, String text, String inReplyTo) {}

  public static ConnectApi.ChatterConversation searchConversation(String conversationId, String q) {}

  public static ConnectApi.ChatterConversation searchConversation(String conversationId, String pageParam, Integer pageSize, String q) {}

  public static ConnectApi.ChatterConversation searchConversation(String communityId, String conversationId, String q) {}

  public static ConnectApi.ChatterConversation searchConversation(String communityId, String conversationId, String pageParam, Integer pageSize, String q) {}

  public static ConnectApi.ChatterConversationPage searchConversations(String q) {}

  public static ConnectApi.ChatterConversationPage searchConversations(String pageParam, Integer pageSize, String q) {}

  public static ConnectApi.ChatterConversationPage searchConversations(String communityId, String q) {}

  public static ConnectApi.ChatterConversationPage searchConversations(String communityId, String pageParam, Integer pageSize, String q) {}

  public static ConnectApi.ChatterMessagePage searchMessages(String q) {}

  public static ConnectApi.ChatterMessagePage searchMessages(String pageParam, Integer pageSize, String q) {}

  public static ConnectApi.ChatterMessagePage searchMessages(String communityId, String q) {}

  public static ConnectApi.ChatterMessagePage searchMessages(String communityId, String pageParam, Integer pageSize, String q) {}

  public static ConnectApi.ChatterMessage sendMessage(String text, String recipients) {}

  public static ConnectApi.ChatterMessage sendMessage(String communityId, String text, String recipients) {}

}