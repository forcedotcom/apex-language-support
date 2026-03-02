/**
 * Get, create, and update Data 360 activation targets.
 */
public class CdpActivationTarget {

  public static ConnectApi.ActivationTarget createActivationTarget(ConnectApi.ActivationTargetInput input) {}

  public static ConnectApi.ActivationTarget getActivationTarget(String activationTargetId) {}

  public static ConnectApi.ActivationTargetCollection getActivationTargets() {}

  public static ConnectApi.ActivationTargetCollection getActivationTargetsPaginated(Integer batchSize, Integer offset, String orderBy, String filters) {}

  public static ConnectApi.ActivationTarget updateActivationTarget(String activationTargetId, ConnectApi.ActivationTargetInput input) {}

}