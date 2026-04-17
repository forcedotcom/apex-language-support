/**
 * Chatter conversation.
 */
global class ChatterConversation {

  /**
   * ID for the conversation.
   */
  global String conversationId;

  /**
   * Connect REST API URL identifying the conversation.
   */
  global String conversationUrl;

  /**
   * List of users in the conversation.
   */
  global List < ConnectApi.UserSummary > members;

  /**
   * Content of the conversation.
   */
  global ConnectApi.ChatterMessagePage messages;

  /**
   * Specifies if the conversation is read ( true ) or not read ( false ).
   */
  global Boolean read;

}