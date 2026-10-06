/**
 * Stores the result of an AuthProviderPluginClass refresh method. OAuth authentication flow provides a refresh token that can be used to get a new access token. Access tokens have a limited lifetime as specified by the session timeout value. When an access token expires, use a refresh token to get a new access token.
 * Usage
 * The OAuthRefreshResult class contains the parameters, accessToken, refreshToken, and error, all of which are of type string. For a code example, see .
 */
global class OAuthRefreshResult {
    /**
     * The OAuth access token for the user who is currently logged in.
     * String
     */
    global webservice String accessToken;
    /**
     * Error that occurs when a user unsuccessfully attempts to authenticate with the custom authentication provider.
     * String
     */
    global webservice String error;
    /**
     * The OAuth refresh token for the user who is currently logged in.
     * String
     */
    global webservice String refreshToken;

    /**
     * Creates an instance of the OAuthRefreshResult class using the specified access token and refresh token for a custom authentication provider plug-in. Use this method when you know that the refresh was successful.
     */
    global OAuthRefreshResult(String accessToken, String refreshToken) { }

    /**
     * Creates an instance of the OAuthRefreshResult class using the specified access token, refresh token, and error for a custom authentication provider plug-in.
     */
    global OAuthRefreshResult(String accessToken, String refreshToken, String error) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}