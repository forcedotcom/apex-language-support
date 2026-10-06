/**
 * Contains methods to create a custom OAuth-based authentication provider plug-in for single sign-on in to Salesforce. Use this class to create a custom authentication provider plug-in if you can’t use one of the authentication providers that Salesforce provides.
 * Usage
 * To create a custom authentication provider for single sign-on, create a class that extends Auth.AuthProviderPluginClass. This class allows you to store the custom configuration for your authentication provider and handle authentication protocols when users log in to Salesforce with their login credentials for an external service provider. In Salesforce, the class that implements this interface appears in the Provider Type drop-down list in Auth. Providers in Setup. Make sure that the user you specify to run the class has “Customize Application” and “Manage Auth. Providers” permissions.
 * As of API version 39.0, use the abstract class AuthProviderPluginClass to create a custom external authentication provider. This class replaces the AuthProviderPlugin interface. If you’ve already implemented a custom authentication provider plug-in using the interface, it still works. However, use AuthProviderPluginClass to extend your plug-in. If you haven’t created an interface, create a custom authentication provider plug-in by extending this abstract class. For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/authproviderplugin.htm" target="_blank">Create a Custom Authentication Provider Plug-in</a>.
 */
global abstract class AuthProviderPluginClass implements Auth.AuthProviderPlugin {
    global AuthProviderPluginClass() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns a new access token, which is used to update an expired access token.
     * Usage
     * A successful request returns a Auth.OAuthRefreshResult with the access token and refresh token in the response. If you receive an error, make sure that you set the error string to the error message. A NULL error string indicates no error.
     * The refresh method works only with named credentials; it doesn’t respect the standard OAuth refresh flow. The refresh method with named credentials works only if the earlier request returns a 401.
     * @return Returns the new access token, or an error message if an error occurs.
     */
    global virtual Auth.OAuthRefreshResult refresh(Map authProviderConfiguration, String refreshToken) { return null; }

    global override virtual String toString() { return null; }
}