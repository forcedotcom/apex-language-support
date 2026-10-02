/**
 * This interface is deprecated. For new development, use the abstract class Auth.AuthProviderPluginClass to create a custom OAuth-based authentication provider plug-in for single sign-on in to Salesforce.
 * <p>Usage
 * Deprecated. Existing implementations that use Auth.AuthProviderPlugin still work. For new development, use Auth.AuthProviderPluginClass.
 */
global interface AuthProviderPlugin {
    virtual Boolean equals(Object arg0);

    /**
     * Deprecated as of API version 39.0. Use the corresponding method in Auth.AuthProviderPluginClass.
     * <p>Usage
     * Returns the custom metadata type API name for a custom OAuth-based authentication provider for single sign-on to Salesforce. The getCustomMetatadaType() method returns only custom metadata type names. It does not return custom metadata record names.
     * @return The custom metadata type API name for the authentication provider.
     */
    abstract String getCustomMetadataType();

    /**
     * Deprecated as of API version 39.0. Use the corresponding method in Auth.AuthProviderPluginClass.
     * <p>Usage
     * Returns information from the custom authentication provider about the current user. The registration handler and other authentication provider flows use this information.
     * @return Creates a new instance of the Auth.UserData class.
     */
    abstract Auth.UserData getUserInfo(Map authProviderConfiguration, Auth.AuthProviderTokenResponse response);

    /**
     * Deprecated as of API version 39.0. Use the corresponding method in Auth.AuthProviderPluginClass.
     * <p>Usage
     * Uses the authentication provider’s supported authentication protocol to return an OAuth access token, OAuth secret or refresh token, and the state passed in when the request for the current user was initiated.
     * @return Creates an instance of the AuthProviderTokenResponse class.
     */
    abstract Auth.AuthProviderTokenResponse handleCallback(Map authProviderConfiguration, Auth.AuthProviderCallbackState callbackState);

    virtual Integer hashCode();

    /**
     * Deprecated as of API version 39.0. Use the corresponding method in Auth.AuthProviderPluginClass.
     * <p>Usage
     * Returns the URL where the user is redirected for authentication.
     * @return The URL of the page where the user is redirected for authentication.
     */
    abstract System.PageReference initiate(Map authProviderConfiguration, String stateToPropagate);

    virtual String toString();
}