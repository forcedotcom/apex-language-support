/**
 * Contains methods that apply a digital signature to a JSON Web Token (JWT), using a JSON Web Signature (JWS) data structure. This class creates the signed JWT bearer token, which can be used to request an OAuth access token in the OAuth 2.0 JWT bearer token flow.
 * <p>Usage
 * Use the methods in this class to sign the JWT bearer token with the X509 certificate.
 */
global class JWS {
    /**
     * Creates an instance of the JWS class using the specified Auth.JWT payload and the certificate used for signing the JWT bearer token.
     * <p>Usage
     * Calls the toJSONString() method in Auth.JWT and sets the resulting string as the payload of the JWT bearer token. Alternatively, you can specify the payload directly using JWS(payload, certDevName).
     */
    global JWS(Auth.JWT jwt, String certDevName) { }

    /**
     * Creates an instance of the JWS class using the specified payload and certificate used for signing the JWT bearer token.
     * <p>Usage
     * Sets the payload string as the payload of the JWT bearer token. Alternatively, if you generate the payload using Auth.JWT, you can use JWS(jwt, certDevName) instead.
     */
    global JWS(String payload, String certDevName) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the compact serialization representation of the JWS as a concatenated string, with the encoded JWS header, encoded JWS payload, and encoded JWS signature strings separated by period ('.') characters.
     */
    global String getCompactSerialization() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}