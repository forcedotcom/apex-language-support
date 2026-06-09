/**
 * Get the status and available actions for flow approval processes.
 */
global class FlowApprovalProcesses {

  global FlowApprovalProcesses() {}

  global static ConnectApi.FlowApprovalProcessCollection getFlowApprovalProcessWithStatus(String relatedRecordId, List<String> processNames) {}

  global Object clone() {}

}