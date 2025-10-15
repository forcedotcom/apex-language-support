global class Oauth2TokenExchangeHandler {
	global Oauth2TokenExchangeHandler() { }
	global Object clone() { }
	global Contact getContactForTokenSubject(Id networkId, Auth.TokenValidationResult result, Boolean canCreateContact, String appDeveloperName, Auth.IntegratingAppType appType) { }
	global User getUserForTokenSubject(Id networkId, Auth.TokenValidationResult result, Boolean canCreateUser, String appDeveloperName, Auth.IntegratingAppType appType) { }
	global Boolean mapToUser(Id networkId, Auth.TokenValidationResult result, Boolean canCreateUser, Boolean canCreateContact, String appDeveloperName, Auth.IntegratingAppType appType) { }
	global Auth.TokenValidationResult validateIncomingToken(String appDeveloperName, Auth.IntegratingAppType appType, String incomingToken, Auth.OAuth2TokenExchangeType tokenType) { }

}