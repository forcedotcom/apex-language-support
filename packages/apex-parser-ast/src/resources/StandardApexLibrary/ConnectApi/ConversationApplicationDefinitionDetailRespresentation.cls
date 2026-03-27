/**
 * Information about the conversation application definition.
 */
global class ConversationApplicationDefinitionDetailRespresentation {

  /**
   * Basic information of the bot associated with this conversation application.
   */
  global ConnectApi.BotInfoRepresentation botInfo;

  /**
   * Error message for the failed get operation.
   */
  global String errorMessage;

  /**
   * Conversation application integration types. Values are: Api Slack
   */
  global ConnectApi.ConversationApplicationIntegrationType integrationApplication;

  /**
   * Name of the conversation application.
   */
  global String integrationName;

  /**
   * Success indicator of the get operation.
   */
  global Boolean isSuccess;

  /**
   * Base URL of the bot runtime API.
   */
  global String runtimeUrl;

}