/**
 * This interface is deprecated. For new development, use the abstract class Auth.AuthProviderPluginClass to create a custom OAuth-based authentication provider plug-in for single sign-on in to Salesforce.
 */
global interface AuthProviderPlugin {

  /**
   * Deprecated as of API version 39.0. Use the corresponding method in Auth.AuthProviderPluginClass .
   * @return String
   */
  String getCustomMetadataType();

  /**
   * Deprecated as of API version 39.0. Use the corresponding method in Auth.AuthProviderPluginClass .
   * @param String 
   * @param authProviderConfiguration The configuration for the custom authentication provider. When you create a custom metadata type in Salesforce, the configuration populates with the custom metadata type default values. Or you can set the configuration with values you enter when you create the custom provider in Auth. Providers in Setup.
   * @param response The OAuth access token, OAuth secret or refresh token, and state provided by the authentication provider to authenticate the current user.
   * @return Auth.UserData
   */
  Auth.UserData getUserInfo(Map< String, String > authProviderConfiguration, Auth.AuthProviderTokenResponse response);

  /**
   * Deprecated as of API version 39.0. Use the corresponding method in Auth.AuthProviderPluginClass .
   * @param String 
   * @param authProviderConfiguration The configuration for the custom authentication provider. When you create a custom metadata type in Salesforce, the configuration populates with the custom metadata type default values. Or you can set the configuration with values you enter when you create the custom provider in Auth. Providers in Setup.
   * @param callbackState The class that contains the HTTP headers, body, and queryParams of the authentication request.
   * @return Auth.AuthProviderTokenResponse
   */
  Auth.AuthProviderTokenResponse handleCallback(Map< String, String > authProviderConfiguration, Auth.AuthProviderCallbackState callbackState);

  /**
   * Deprecated as of API version 39.0. Use the corresponding method in Auth.AuthProviderPluginClass .
   * @param String 
   * @param authProviderConfiguration The configuration for the custom authentication provider. When you create a custom metadata type in Salesforce, the configuration populates with the custom metadata type default values. Or you can set the configuration with values you enter when you create the custom provider in Auth. Providers in Setup.
   * @param stateToPropagate The state passed in to initiate the authentication request for the user.
   * @return System.PageReference
   */
  System.PageReference initiate(Map< String, String > authProviderConfiguration, String stateToPropagate);

}