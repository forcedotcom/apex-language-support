/**
 * Represents the activation target subject configuration input.
 */
global class ActivationTargetSubjectConfigInput {

  global ActivationTargetSubjectConfigInput() {}

  /**
   * Developer name of activation target subject configuration.
   */
  global String developerName;

  /**
   * Path of the activation target subject configuration.
   */
  global List < ConnectApi.QueryPathInputConfig > queryPathConfig;

  global Object clone() {}

}