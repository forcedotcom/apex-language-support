/**
 * Use this class to create a token exchange handler that validates tokens from an external identity provider and maps the token’s subject to a Salesforce user during the OAuth 2.0 token exchange flow. The handler can also be used to create users by setting up a new User object and returning it to Salesforce for automatic insertion.
 * <p>Usage
 * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/token_exchange_handler.htm" target="_blank">Token Exchange Handler Validation and Subject Mapping</a>.
 */
global abstract class Oauth2TokenExchangeHandler {
    global Object Oauth2TokenExchangeHandler() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Contact getContactForTokenSubject(Id networkId, Auth.TokenValidationResult result, Boolean canCreateContact, String appDeveloperName, Auth.IntegratingAppType appType) { return null; }

    /**
     * Finds the subject defined in the external identity provider’s token so that it can be mapped to a Salesforce subject.
     * @return Returns a User object with the user information obtained from the token, from Salesforce, and from callouts to the identity provider, if applicable. The User object can be an existing user record or a new user that hasn’t been inserted in the database. If it’s a new user, Salesforce automatically inserts the user on behalf of the token exchange handler.
     */
    global virtual User getUserForTokenSubject(Id networkId, Auth.TokenValidationResult result, Boolean canCreateUser, String appDeveloperName, Auth.IntegratingAppType appType) { return null; }

    global virtual Integer hashCode() { return 0; }

    global virtual Boolean mapToUser(Id networkId, Auth.TokenValidationResult result, Boolean canCreateUser, Boolean canCreateContact, String appDeveloperName, Auth.IntegratingAppType appType) { return false; }

    global override virtual String toString() { return null; }

    /**
     * Validates an access token, refresh token, ID token, SAML 2.0 assertion, or JWT passed from an external identity provider during the OAuth 2.0 token exchange flow.
     * @return Returns information about whether the token is valid, data extracted from the token, the token itself, and the token type. It can also return a custom error message if the validation failed.
     */
    global virtual Auth.TokenValidationResult validateIncomingToken(String appDeveloperName, Auth.IntegratingAppType appType, String incomingToken, Auth.OAuth2TokenExchangeType tokenType) { return null; }
}