/**
 * The results of requesting a flow approval status.
 */
global class FlowApprovalProcessCollection {

  /**
   * A list of flow approval processes retrieved with the specified process names and related record ID.
   */
  global List < ConnectApi.FlowApprovalProcess > flowApprovalProcesses;

  /**
   * The ID of the related record associated with the approval submission.
   */
  global String relatedRecordId;

}