/**
 * Represents an activation target subject output.
 */
global class ActivationTargetSubject {

  /**
   * Developer name of the activation target subject.
   */
  global String developerName;

  /**
   * Master label of the activation target subject.
   */
  global String masterLabel;

  /**
   * Query path for the activation target.
   */
  global List < ConnectApi.QueryPathConfigList > queryPathConfigListRepresentation;

}