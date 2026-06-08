/**
 * Access and update activation information of a bot version.
 */
global class BotVersionActivation {

  global BotVersionActivation() {}

  public static ConnectApi.BotVersionActivationInfo getVersionActivationInfo(String botVersionId) {}

  public static ConnectApi.BotVersionActivationInfo updateVersionStatus(String botVersionId, ConnectApi.BotVersionActivationStatus status, ConnectApi.BotVersionActivationInput postBody) {}

  global Object clone() {}

}