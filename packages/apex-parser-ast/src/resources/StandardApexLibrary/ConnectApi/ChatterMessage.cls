/**
 * Chatter message.
 */
global class ChatterMessage {

  /**
   * Contents of the message.
   */
  global ConnectApi.MessageBody body;

  /**
   * ID for the conversation.
   */
  global String conversationId;

  /**
   * Connect REST API URL identifying the conversation.
   */
  global String conversationUrl;

  /**
   * ID of the message.
   */
  global String id;

  /**
   * List of the recipients of the message.
   */
  global List < ConnectApi.UserSummary > recipients;

  /**
   * Sender of the message.
   */
  global ConnectApi.UserSummary sender;

  /**
   * Information about the Experience Cloud site from which the message was sent. Returns null for the default site or if digital experiences isn’t enabled.
   */
  global ConnectApi.Reference sendingCommunity;

  /**
   * The date and time the message was sent.
   */
  global Datetime sentDate;

  /**
   * Connect REST API URL identifying the current page of the conversation.
   */
  global String url;

}