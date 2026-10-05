/**
 * Contains methods that describe the result of the token validation performed by a token exchange handler using the validateIncomingToken method in the Auth.Oauth2TokenExchangeHandler class during the OAuth 2.0 token exchange flow.
 * <p>Usage
 * For a full example implementation that shows how to get information from the TokenValidationResult class, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/token_exchange_handler.htm" target="_blank">OAuth 2.0 Token Exchange Handler Examples</a>.
 * <p>Example
 * Here’s is an example of the Auth.TokenValidationResult class.
 * global class TokenValidationResult {
 *     global TokenValidationResult(Boolean valid) { this.isValid = valid; }
 *
 *     global TokenValidationResult(Boolean isValid, Object data, Auth.UserData userData,
 *         String token, Auth.OAuth2TokenExchangeType tokenType, String customErrorMsg) {
 *
 *         this.isValid = isValid;
 *         this.data = data;
 *         this.userData = userData;
 *         this.token = token;
 *         this.tokenType = tokenType;
 *         this.customErrorMsg = customErrorMsg;
 *
 *     }
 *
 *     global Boolean isValid;
 *     global Object data;
 *     global Auth.UserData userData;
 *     global String token;
 *     global Auth.OAuth2TokenExchangeType tokenType; //Enum
 *     global String customErrorMsg; //Custom error message that’s returned to the client if token validation fails
 *
 *     global Boolean isValid(){
 *         return isValid;
 *     }
 *     global Object getData(){
 *         return data;
 *     }
 *     global Auth.UserData getUserData(){
 *         return userData;
 *     }
 *     global String getToken(){
 *         return token;
 *     }
 *     global OAuth2TokenExchangeType getTokenType(){
 *         return tokenType;
 *     }
 *     global String getCustomErrorMessage(){
 *         return customErrorMsg;
 *     }
 * }
 */
global class TokenValidationResult {
    /**
     * A custom error message that’s returned if token validation fails.
     * <p>String
     */
    global String customErrorMsg;
    /**
     * Contains information about the user that isn’t stored in the Auth.UserData class, such as information obtained via callouts to the external identity provider.
     * <p>Object
     */
    global Object data;
    /**
     * Indicates whether the token is valid or not, based on the custom validation logic in your token exchange handler.
     * <p>Boolean
     */
    global Boolean isValid;
    /**
     * The token from the external identity provider.
     * <p>String
     */
    global String token;
    /**
     * The type of token from the external identity provider. It can be an access token, refresh token, ID token, SAML 2.0 assertion, or a JSON Web Token (JWT).
     * <p><a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_enum_Auth_OAuth2TokenExchangeType.htm" target="_blank">Auth.OAuth2TokenExchangeType</a>
     */
    global Auth.OAuth2TokenExchangeType tokenType;
    /**
     * Information about the user that’s obtained from the identity provider’s token.
     * <p><a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_class_Auth_UserData.htm" target="_blank">Auth.UserData</a>
     */
    global Auth.UserData userData;

    /**
     * Creates an instance of the Auth.TokenValidationResult class to describe a valid token validation result during the OAuth 2.0 token exchange flow.
     */
    global TokenValidationResult(Boolean valid) { }

    /**
     * Creates an instance of the Auth.TokenValidationResult class to describe the result of token validation performed during the OAuth 2.0 token exchange flow.
     */
    global TokenValidationResult(Boolean isValid, Object data, Auth.UserData userData, String token, Auth.OAuth2TokenExchangeType tokenType, String customErrorMsg) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Retrieves the CustomErrorMsg that’s returned when token validation fails.
     */
    global String getCustomErrorMessage() { return null; }

    /**
     * Retrieves data from the identity provider token. This data can include custom data that isn’t stored in the userData property.
     */
    global Object getData() { return null; }

    /**
     * Retrieves the token that was passed from the external identity provider.
     */
    global String getToken() { return null; }

    /**
     * Retrieves the type of token that was passed from the external identity provider.
     */
    global Auth.OAuth2TokenExchangeType getTokenType() { return null; }

    /**
     * Retrieves information about the user. The user information can be obtained from the identity provider’s token or from callouts to the identity provider, if applicable.
     */
    global Auth.UserData getUserData() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isValid() { return false; }

    global override virtual String toString() { return null; }
}