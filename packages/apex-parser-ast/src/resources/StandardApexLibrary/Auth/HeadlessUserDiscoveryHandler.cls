/**
 * Use this interface to create a headless user discovery handler that you implement during headless login, passwordless login, and forgot password flows.
 */
global interface HeadlessUserDiscoveryHandler {

  Auth.HeadlessUserDiscoveryResponse discoverUserFromLoginHint(Id networkId, String loginHint, Auth.VerificationAction verificationAction, String customDataJson, Map<String,String> requestAttributes);

}