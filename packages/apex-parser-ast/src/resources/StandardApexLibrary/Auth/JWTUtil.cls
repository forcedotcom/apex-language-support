/**
 * Contains methods for validating a JSON Web Token (JWT) from an external identity provider as part of the OAuth 2.0 token exchange flow. Use these methods as part of the validateIncomingToken method in the Auth.Oauth2TokenExchangeHandler class.
 * <p>Usage
 * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/token_exchange_handler.htm" target="_blank">Token Exchange Handler Validation and Subject Mapping</a>.
 * If the methods in this class fail, Salesforce returns an Auth.JWTValidationException exception.
 */
global class JWTUtil {
    global Object JWTUtil() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static String generateDPoPProofForToken(String httpMethod, String httpUri, String dpopCert, String nonce, String token) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Parses a JWT from an encoded string into a header, payload, and signature. Use this method to decode the JWT without validating it.
     */
    global static Auth.JWT parseJWTFromStringWithoutValidation(String incomingJWT) { return null; }

    global override virtual String toString() { return null; }

    /**
     * Parses and validates the JWT using a certificate saved in Salesforce. The certificate can be self-signed or signed by a certificate authority.
     */
    global static Auth.JWT validateJWTWithCert(String incomingJWT, String certDeveloperName) { return null; }

    /**
     * Parses and validates the JWT using a public key from the external identity provider.
     */
    global static Auth.JWT validateJWTWithKey(String incomingJWT, String publicKey) { return null; }

    /**
     * Parses and validates the JWT using a remote JSON Web Key Set (JWKS) endpoint on your external identity provider.
     */
    global static Auth.JWT validateJWTWithKeysEndpoint(String incomingJWT, String keysEndpoint, Boolean shouldUseCache) { return null; }
}