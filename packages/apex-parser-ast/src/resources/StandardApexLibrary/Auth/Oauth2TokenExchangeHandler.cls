/**
 * Use this class to create a token exchange handler that validates tokens from an external identity provider and maps the token’s subject to a Salesforce user during the OAuth 2.0 token exchange flow. The handler can also be used to create users by setting up a new User object and returning it to Salesforce for automatic insertion.
 */
global class Oauth2TokenExchangeHandler {

  global Oauth2TokenExchangeHandler() {}

  global User getUserForTokenSubject(Id networkId, Auth.TokenValidationResult result, Boolean canCreateUser, String appDeveloperName, Auth.IntegratingAppType appType) {}

  global Auth.TokenValidationResult validateIncomingToken(String appDeveloperName, Auth.IntegratingAppType appType, String incomingToken, Auth.OAuth2TokenExchangeType tokenType) {}

  global Object clone() {}

  global Contact getContactForTokenSubject(Id networkId, Auth.TokenValidationResult result, Boolean canCreateContact, String appDeveloperName, Auth.IntegratingAppType appType) {}

  global Boolean mapToUser(Id networkId, Auth.TokenValidationResult result, Boolean canCreateUser, Boolean canCreateContact, String appDeveloperName, Auth.IntegratingAppType appType) {}

}