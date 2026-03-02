/**
 * Get, create, update, and delete Data 360 activations.
 */
public class CdpActivation {

  public static ConnectApi.ActivationCollection getActivations() {}

  public static ConnectApi.ActivationCollection getActivationsPaginated(Integer batchSize, Integer offset, String orderBy, String filters) {}

  public static ConnectApi.Activation createActivation(ConnectApi.ActivationDefinitionInput input) {}

  public static Void deleteActivation(String activationId) {}

  public static ConnectApi.Activation getActivation(String activationId) {}

  public static ConnectApi.Activation updateActivation(String activationId, ConnectApi.ActivationDefinitionInput input) {}

}