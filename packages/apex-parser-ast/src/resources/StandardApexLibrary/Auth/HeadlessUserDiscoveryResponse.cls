/**
 * Contains methods to describe the result of headless user discovery using a handler that implements the Auth.HeadlessUserDiscoveryHandler interface during headless login, passwordless login, and forgot password flows.
 */
global class HeadlessUserDiscoveryResponse {

  global HeadlessUserDiscoveryResponse(Set<Id> userIds, String customErrorMessage) {}

  global String customErrorMessage;

  global Set<Id> userIds;

  global Object clone() {}

}