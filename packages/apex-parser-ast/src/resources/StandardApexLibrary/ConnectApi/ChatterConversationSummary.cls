/**
 * Chatter conversation summary.
 */
global class ChatterConversationSummary {

  /**
   * ID for the conversation summary.
   */
  global String id;

  /**
   * Contents of the latest message.
   */
  global ConnectApi.ChatterMessage latestMessage;

  /**
   * List of members in the conversation.
   */
  global List < ConnectApi.UserSummary > members;

  /**
   * Specifies if the conversation is read ( true ) or not read ( false ).
   */
  global Boolean read;

  /**
   * Connect REST API URL to the conversation summary.
   */
  global String url;

}