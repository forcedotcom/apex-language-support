/**
 * Activation status of the bot version.
 */
global class BotVersionActivationInput {

  global BotVersionActivationInput() {}

  /**
   * Activation status of the bot version. Values are: Active Inactive Activation status must be specified in the status or postBody parameter.
   */
  global ConnectApi.BotVersionActivationStatus status;

  global Object clone() {}

}