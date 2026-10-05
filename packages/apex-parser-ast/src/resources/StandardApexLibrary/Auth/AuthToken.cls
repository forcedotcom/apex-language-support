/**
 * Contains methods for getting and revoking access and refresh tokens that are issued when a user logs in via a single sign-on (SSO) flow that uses an authentication provider, such as Facebook.
 * <p>Usage
 * To authenticate users via an authentication provider, you must create a class that implements the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_auth_plugin.htm" target="_blank">Auth.RegistrationHandler interface</a>. When a user logs in to Salesforce via a provider such as Facebook, they’re issued an access token and in some cases, a refresh token. To retrieve and revoke these tokens, use the methods in the Auth.AuthToken class.
 */
global class AuthToken {
    global AuthToken() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns an access token for the current user using the specified 18-character identifier of an AuthProvider definition in your org and the proper name of the provider, such as Salesforce or Facebook.
     */
    global static String getAccessToken(String authProviderId, String providerName) { return null; }

    /**
     * Returns a map from the provider’s identifier to the access token for the currently logged-in Salesforce user. The identifier value depends on the provider. For example, for Salesforce, it’s the user ID, while for Facebook, it’s the user number.
     */
    global static Map getAccessTokenMap(String authProviderId, String providerName) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns a map from the third-party provider’s identifier containing a refreshed access token for the currently logged-in Salesforce user.
     * <p>Usage
     * The returned map contains AccessToken and RefreshError keys. Evaluate the keys in the response to check if the request was successful. For a successful request, the RefreshError value is null, and AccessToken is a token value. For an unsuccessful request, the RefreshError value is an error message, and the AccessToken value is null.
     * When successful, this method updates the token stored in the database, which you can get using Auth.AuthToken.getAccessToken().
     * If you’re using an OpenID Connect authentication provider, an id_token isn’t required in the response from the provider. If a Token Issuer is specified in the Auth. Provider settings and an id_token is provided anyway, Salesforce verifies it.
     * <p>Example
     * String accessToken = Auth.AuthToken.getAccessToken('0SOD000000000DeOAI', 'Open ID Connect');
     * Map<String, String> responseMap = Auth.AuthToken.refreshAccessToken('0SOD000000000DeOAI', 'Open ID Connect', accessToken);
     * A successful request includes the access token in the response.
     *  (RefreshError,null)(AccessToken,00DD00000007BhE!AQkAQFzj...)
     */
    global static Map refreshAccessToken(String authProviderId, String providerName, String oldAccessToken) { return null; }

    /**
     * Revokes the access token for a specified SSO user from a provider such as Facebook. You can use this method only if the IsNotSsoUsable field on the associated ThirdPartyAccountLink object is set to false.
     * <p>Example
     * The following example revokes a Facebook user's access token.
     * Auth.AuthToken.revokeAccess('0SOxx00000#####', 'facebook', '005xx00000#####', 'ThirdPartyIdentifier_exist214176560#####');
     * @return The return value is true if the revokeAccess() operation is successful; otherwise false.
     */
    global static Boolean revokeAccess(String authProviderId, String providerName, String userId, String remoteIdentifier) { return false; }

    global override virtual String toString() { return null; }
}