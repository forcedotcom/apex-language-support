/**
 * This class contains authorization request response data.
 */
global class AuthRequestResponse {
    /**
     * Creates a new instance of the RichMessaging.AuthRequestResponse class.
     */
    global Object AuthRequestResponse(String accessToken, String contextRecordId, String authProviderName) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Gets the authorization access token.
     * @return The access token.
     */
    global String getAccessToken() { return null; }

    /**
     * Get the authorization provider name.
     * @return The authorization provider name.
     */
    global String getAuthProviderName() { return null; }

    /**
     * Gets the context record ID.
     * @return The context record ID.
     */
    global String getContextRecordId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}