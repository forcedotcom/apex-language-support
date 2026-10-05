/**
 * Contains a method to revoke OAuth access tokens and refresh tokens. This method supports opaque tokens and JSON Web Token (JWT)-based access tokens, including guest and named user JWT-based access tokens.
 * <p>Usage
 * When a client completes an authorization flow and is authorized to access Salesforce data, they’re issued an access token, which the client can use to make authenticated requests for protected Salesforce resources. The client can also use refresh tokens to get more access tokens. If you don’t want the client to access Salesforce data anymore, revoke its Salesforce tokens.
 * This class is distinct from the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_class_Auth_AuthToken.htm" target="_blank">Auth.AuthToken</a> class, which contains a method to revoke tokens issued by a third-party provider instead of Salesforce tokens.
 */
global class OauthToken {
    global OauthToken() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Revokes Salesforce-issued OAuth tokens.
     * @return The method returns true if successful, and false if not. For invalid or expired tokens, the method returns a <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_classes_exception_methods.htm" target="_blank">NoDataFoundException</a> exception.
     */
    global static Boolean revokeToken(Auth.OauthTokenType type, String authToken) { return false; }

    global override virtual String toString() { return null; }
}