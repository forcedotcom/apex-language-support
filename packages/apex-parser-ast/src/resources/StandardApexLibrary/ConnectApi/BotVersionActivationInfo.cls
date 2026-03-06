/**
 * Success or failure information of the bot version activation.
 */
global class BotVersionActivationInfo {

  /**
   * Indicates whether the bot is active or not.
   */
  global Boolean isActivated;

  /**
   * Failure messages.
   */
  global List < String > messages;

  /**
   * Indicates whether the activation was successful or not.
   */
  global Boolean success;

}