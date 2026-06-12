/**
 * Get, create, update, and delete Data 360 activations.
 */
global class CdpActivation {

  global CdpActivation() {}

  global static ConnectApi.ActivationCollection getActivations() {}

  global static ConnectApi.ActivationCollection getActivationsPaginated(Integer batchSize, Integer offset, String orderBy, String filters) {}

  global static ConnectApi.Activation createActivation(ConnectApi.ActivationDefinitionInput input) {}

  global static void deleteActivation(String activationId) {}

  global static ConnectApi.Activation getActivation(String activationId) {}

  global static ConnectApi.Activation updateActivation(String activationId, ConnectApi.ActivationDefinitionInput input) {}

  global Object clone() {}

}