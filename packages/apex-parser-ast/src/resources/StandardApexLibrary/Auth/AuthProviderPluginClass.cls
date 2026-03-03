/**
 * Contains methods to create a custom OAuth-based authentication provider plug-in for single sign-on in to Salesforce. Use this class to create a custom authentication provider plug-in if you can’t use one of the authentication providers that Salesforce provides.
 */
global class AuthProviderPluginClass {

  /**
   * Returns the custom metadata type API name for a custom OAuth-based authentication provider for single sign-on to Salesforce.
   * @return String
   */
  public String getCustomMetadataType() {}

  /**
   * Returns information from the custom authentication provider about the current user. This information is used by the registration handler and in other authentication provider flows.
   * @param String 
   * @param authProviderConfiguration The configuration for the custom authentication provider. When you create a custom metadata type in Salesforce, the configuration populates it with the custom metadata type default values. Or you can set the configuration with values that you enter when you create the custom provider in Auth. Providers in Setup.
   * @param response The OAuth access token, OAuth secret or refresh token, and state provided by the authentication provider to authenticate the current user.
   * @return Auth.UserData
   */
  public Auth.UserData getUserInfo(Map< String, String > authProviderConfiguration, Auth.AuthProviderTokenResponse response) {}

  /**
   * Uses the authentication provider’s supported authentication protocol to return an OAuth access token, OAuth secret or refresh token, and the state passed in when the request for the current user was initiated.
   * @param String 
   * @param authProviderConfiguration The configuration for the custom authentication provider. When you create a custom metadata type in Salesforce, the configuration populates with the custom metadata type default values. Or you can set the configuration with values you enter when you create the custom provider in Auth. Providers in Setup.
   * @param callbackState The class that contains the HTTP headers, body, and queryParams of the authentication request.
   * @return Auth.AuthProviderTokenResponse
   */
  public Auth.AuthProviderTokenResponse handleCallback(Map< String, String > authProviderConfiguration, Auth.AuthProviderCallbackState callbackState) {}

  /**
   * Returns the URL where the user is redirected for authentication.
   * @param String 
   * @param authProviderConfiguration The configuration for the custom authentication provider. When you create a custom metadata type in Salesforce, the configuration populates with the custom metadata type default values. Or you can set the configuration with values you enter when you create the custom provider in Auth. Providers in Setup.
   * @param stateToPropagate The state passed in to initiate the authentication request for the user.
   * @return System.PageReference
   */
  public System.PageReference initiate(Map< String, String > authProviderConfiguration, String stateToPropagate) {}

  /**
   * Returns a new access token, which is used to update an expired access token.
   * @param String 
   * @param authProviderConfiguration The configuration for the custom authentication provider. When you create a custom metadata type in Salesforce, the configuration populates with the custom metadata type default values. Or you can set the configuration with values you enter when you create the custom provider in Auth. Providers in Setup.
   * @param refreshToken The refresh token for the user who is logged in.
   * @return Auth.OAuthRefreshResult
   */
  public Auth.OAuthRefreshResult refresh(Map< String, String > authProviderConfiguration, String refreshToken) {}

}