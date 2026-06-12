/**
 * Access and update activation information of a bot version.
 */
global class BotVersionActivation {

  global BotVersionActivation() {}

  global static ConnectApi.BotVersionActivationInfo getVersionActivationInfo(String botVersionId) {}

  global static ConnectApi.BotVersionActivationInfo updateVersionStatus(String botVersionId, ConnectApi.BotVersionActivationStatus status, ConnectApi.BotVersionActivationInput postBody) {}

  global Object clone() {}

}