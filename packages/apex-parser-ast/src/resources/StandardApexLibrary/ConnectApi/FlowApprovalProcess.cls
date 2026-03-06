/**
 * Details about a flow approval process, its status, and available actions.
 */
global class FlowApprovalProcess {

  /**
   * The name of the flow approval process.
   */
  global String approvalProcessName;

  /**
   * Available actions for the flow approval process.
   */
  global List < ConnectApi.FlowApprovalProcessAction > availableActions;

  /**
   * Specifies whether one or more approval submissions are in progress ( true ) or not ( false ).
   */
  global Boolean isApprovalInProgress;

}