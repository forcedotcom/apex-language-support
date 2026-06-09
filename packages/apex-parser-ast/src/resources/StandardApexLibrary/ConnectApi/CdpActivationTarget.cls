/**
 * Get, create, and update Data 360 activation targets.
 */
global class CdpActivationTarget {

  global CdpActivationTarget() {}

  global static ConnectApi.ActivationTarget createActivationTarget(ConnectApi.ActivationTargetInput input) {}

  global static ConnectApi.ActivationTarget getActivationTarget(String activationTargetId) {}

  global static ConnectApi.ActivationTargetCollection getActivationTargets() {}

  global static ConnectApi.ActivationTargetCollection getActivationTargetsPaginated(Integer batchSize, Integer offset, String orderBy, String filters) {}

  global static ConnectApi.ActivationTarget updateActivationTarget(String activationTargetId, ConnectApi.ActivationTargetInput input) {}

  global Object clone() {}

}