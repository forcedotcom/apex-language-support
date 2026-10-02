/**
 * Contains methods that POST the signed JWT bearer token to a token endpoint to request an access token, in the OAuth 2.0 JWT bearer token flow.
 * <p>Usage
 * Use the methods in this class to post a signed JWT bearer token to the OAuth token endpoint, in exchange for an access token.
 * To test HTTP callouts to the token endpoint, use the Auth.HttpCalloutMockUtil class.
 * <p>Example
 * In the following example application, the Apex controller:
 * Creates the JSON Claims Set.
 * Specifies the scope of the request with additional claims.
 * Creates the signed JWT.
 * Specifies the token endpoint and POSTs to it.
 * Gets the access token from the HTTP response.
 * public class MyController{
 *
 *
 *      public MyController() {
 *         Auth.JWT jwt = new Auth.JWT();
 *         jwt.setSub('user@example.com');
 *         jwt.setAud('https://login.salesforce.com');
 *         jwt.setIss('3MVG99OxTyEMCQ3gNp2PjkqeZKxnmAiG1xV4oHh9AKL_rSK.BoSVPGZHQukXnVjzRgSuQqGn75NL7yfkQcyy7');
 *
 *         //Additional claims to set scope
 *         Map<String, Object> claims = new Map<String, Object>();
 *         claims.put('scope', 'scope name');
 *
 *         jwt.setAdditionalClaims(claims);
 *
 *         //Create the object that signs the JWT bearer token
 *         Auth.JWS jws = new Auth.JWS(jwt, 'CertFromCertKeyManagement');
 *
 *         //Get the resulting JWS in case debugging is required
 *         String token = jws.getCompactSerialization();
 *
 *         //Set the token endpoint that the JWT bearer token is posted to
 *         String tokenEndpoint = 'https://login.salesforce.com/services/oauth2/token';
 *
 *         //POST the JWT bearer token
 *         Auth.JWTBearerTokenExchange bearer = new Auth.JWTBearerTokenExchange(tokenEndpoint, jws);
 *
 *         //Get the access token
 *         String accessToken = bearer.getAccessToken();
 *
 *     }
 * }
 */
global class JWTBearerTokenExchange {
    /**
     * Creates an instance of the Auth.JWTBearerTokenExchange class.
     */
    global Object JWTBearerTokenExchange() { return null; }

    /**
     * Creates an instance of the JWTBearerTokenExchange class using the specified token endpoint and the signed JWT bearer token.
     */
    global Object JWTBearerTokenExchange(String tokenEndpoint, Auth.JWS jws) { return null; }

    global Object JWTBearerTokenExchange(String tokenEndpoint, Auth.JWS jws, Boolean isDPoP, String dpopCertName) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the access_token in the token response to the JWT bearer token request.
     * <p>Usage
     * This method extracts the access_token from the token response. If the token response issues the access token in a different parameter, the request fails.
     * If you want the full HTTP token response returned, use getHttpResponse instead.
     */
    global String getAccessToken() { return null; }

    /**
     * Returns the grant type specified in the JWT bearer token request. The grant type value defaults to urn:ietf:params:oauth:grant-type:jwt-bearer.
     */
    global String getGrantType() { return null; }

    /**
     * Returns the full System.HttpResponse token response to the JWT bearer token request.
     * <p>Usage
     * You can get the access token from the full System.HttpResponse. If you want only the access_token from the token response, you can use getAccessToken instead.
     */
    global System.HttpResponse getHttpResponse() { return null; }

    global System.HttpResponse getHttpResponse(String nonce) { return null; }

    /**
     * Returns the JWS specified in the JWT bearer token request.
     */
    global Auth.JWS getJWS() { return null; }

    /**
     * Returns the token endpoint that the JWT bearer token request is POSTed to.
     */
    global String getTokenEndpoint() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the grant type in the JWT bearer token request. Returned by the getGrantType() method.
     */
    global void setGrantType(String grantType) { }

    /**
     * Sets the JWS in the JWT bearer token request. Returned by the getJWS() method.
     */
    global void setJWS(Auth.JWS jws) { }

    /**
     * Sets the token endpoint that the JWT bearer token request is POSTed to. Returned by the getTokenEndpoint() method.
     */
    global void setTokenEndpoint(String tokenEndpoint) { }

    global override virtual String toString() { return null; }

    /**
     * Throw this exception to indicate a problem with the response from the token endpoint in the JWTBearerTokenExchange class. This exception occurs during the OAuth 2.0 JWT bearer token flow when the HTTP response:
     * Fails to return an access token
     * Isn’t in JSON format
     * Returns a response code other than a 200 “OK” success code
     * To get the error message and write it to debug log, use the String getMessage().
     */
    global class JWTBearerTokenExchangeException extends Exception {
        global Object JWTBearerTokenExchangeException() { return null; }

        global Object JWTBearerTokenExchangeException(Exception null) { return null; }

        global Object JWTBearerTokenExchangeException(String null) { return null; }

        global Object JWTBearerTokenExchangeException(String null, Exception null) { return null; }

        global Auth.JWTBearerTokenExchange.JWTBearerTokenExchangeException clone() { return null; }

        global override virtual Boolean equals(Object o) { return false; }

        /**
         * Returns the cause of the exception as an exception object.
         */
        global override virtual Exception getCause() { return null; }

        global override virtual List getDmlFieldNames(Integer index) { return null; }

        global override virtual List getDmlFields(Integer index) { return null; }

        global override virtual String getDmlId(Integer index) { return null; }

        global override virtual Integer getDmlIndex(Integer index) { return 0; }

        global override virtual String getDmlMessage(Integer index) { return null; }

        global override virtual String getDmlStatusCode(Integer index) { return null; }

        global override virtual System.StatusCode getDmlType(Integer index) { return null; }

        global virtual Map getInaccessibleFields() { return null; }

        global virtual Map getInaccessibleFields(Integer index) { return null; }

        /**
         * Returns the line number from where the exception was thrown.
         */
        global override virtual Integer getLineNumber() { return 0; }

        /**
         * Returns the error message that displays for the user.
         */
        global override virtual String getMessage() { return null; }

        global override virtual Integer getNumDml() { return 0; }

        /**
         * Returns the stack trace of a thrown exception as a string.
         */
        global override virtual String getStackTraceString() { return null; }

        /**
         * Returns the type of exception, such as DmlException, ListException, MathException, and so on.
         */
        global override virtual String getTypeName() { return null; }

        global override virtual Integer hashCode() { return 0; }

        /**
         * Sets the cause for this exception, if one hasn’t already been set.
         */
        global override virtual void initCause(Exception cause) { }

        /**
         * Sets the error message that displays for the user.
         */
        global override virtual void setMessage(String message) { }

        global virtual String toString() { return null; }
    }
}