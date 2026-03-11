/**
 * Available actions for a flow approval process.
 */
global class FlowApprovalProcessAction {

  /**
   * The label of an available action.
   */
  global String actionLabel;

  /**
   * The name of an available action.
   */
  global String actionName;

  /**
   * List of in-progress approval submission IDs.
   */
  global List < String > inProgressApprovalSubmissionIds;

  /**
   * The URL of an available action.
   */
  global String url;

}