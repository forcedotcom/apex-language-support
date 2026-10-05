/**
 * Stores the response from the AuthProviderPlugin.handleCallback method.
 */
global class AuthProviderTokenResponse {
    /**
     * The ID token from the third party in encoded JWT format.
     * <p>String
     */
    global webservice String idToken;
    /**
     * The OAuth secret or refresh token for the currently logged-in user.
     * <p>String
     */
    global webservice String oauthSecretOrRefreshToken;
    /**
     * The OAuth access token.
     * <p>String
     */
    global webservice String oauthToken;
    /**
     * The authentication provider.
     * <p>String
     */
    global webservice String provider;
    /**
     * The state passed in to initiate the authentication request for the user.
     * <p>String
     */
    global webservice String state;

    /**
     * Creates an instance of the AuthProviderTokenResponse class for a custom authentication provider plug-in using the specified arguments.
     */
    global AuthProviderTokenResponse(String provider, String oauthToken, String oauthSecretOrRefreshToken, String state) { }

    /**
     * Creates an instance of the AuthProviderTokenResponse class for a custom authentication provider plug-in using the specified arguments. This constructor includes a parameter for the ID token.
     */
    global AuthProviderTokenResponse(String provider, String oauthToken, String oauthSecretOrRefreshToken, String state, String idToken) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}