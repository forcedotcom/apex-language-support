/**
 * Generates the JSON Claims Set in a JSON Web Token (JWT). The resulting Base64-encoded payload can be passed as an argument to create an instance of the Auth.JWS class.
 * <p>Usage
 * Use the methods in this class to generate the payload in a JWT bearer token for the OAuth 2.0 JWT bearer token flow. For more information and a full code sample, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_class_Auth_JWTBearerTokenExchange.htm" target="_blank">JWTBearerTokenExchange Class</a>.
 */
global class JWT {
    global JWT() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a map of additional claims in the JWT, where the key string contains the name of the claim, and the value contains the value of the claim.
     * @return The claims returned depend on how the JWT was generated.
     * If the JWT was generated using other methods in the Auth.JWT class, this method returns the claims that were set using the setAdditionalClaims method.
     * For JWTs generated using methods in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_class_Auth_JWTUtil.htm" target="_blank">Auth.JWTUtil</a> class, the getAdditionalClaims method returns all claims except for these three.
     * aud (audience)—Use the getAud method instead.
     * iss (issuer)—Use the getIss method instead.
     * sub (subject)—Use the getSub method instead.
     * For these JWTs, when the incoming JWT has a claim that stores an inner JSON list, the claim value is returned as a string.
     */
    global Map getAdditionalClaims() { return null; }

    /**
     * Returns the audience (aud) claim that identifies the intended recipients of the JWT.
     */
    global String getAud() { return null; }

    /**
     * Returns the issuer (iss) claim that identifies the issuer of the JWT.
     */
    global String getIss() { return null; }

    /**
     * Returns the not before (nbf) claim that identifies the time before which the JWT must not be accepted for processing, while allowing some leeway for clock skew. This method returns a NoAccess exception for JWTs generated using methods in the Auth.JWTUtil class. To return the nbf claim for these JWTs, use the getAdditionalClaims method instead.
     */
    global Integer getNbfClockSkew() { return 0; }

    /**
     * Returns the subject (sub) claim that identifies the current user of the JWT.
     */
    global String getSub() { return null; }

    /**
     * Returns the length of time (in seconds) that the JWT is valid, which affects the expiration (exp) claim. This method returns a NoAccess exception for JWTs generated using methods in the Auth.JWTUtil class. To return the validity length for these JWTs, use the getAdditionalClaims method instead.
     */
    global Integer getValidityLength() { return 0; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the additional claims in the JWT. Returned by the getAdditionalClaims method.
     * <p>Usage
     * Additional claims must not include any standard claims.
     */
    global void setAdditionalClaims(Map additionalClaims) { }

    /**
     * Sets the audience (aud) claim in the JWT. Returned by the getAud method.
     */
    global void setAud(String aud) { }

    /**
     * Sets the issuer (iss) claim in the JWT. Returned by the getIss method.
     */
    global void setIss(String iss) { }

    /**
     * Sets the not before (nbf) claim in the JWT. Returned by the getNbfClockSkew method. This method returns a NoAccess exception for JWTs generated using methods in the Auth.JWTUtil class. For these JWTs, the incoming JWT determines the nbf claim.
     */
    global void setNbfClockSkew(Integer nbfClockSkew) { }

    /**
     * Sets the subject (sub) claim in the JWT. Returned by the getSub method.
     */
    global void setSub(String sub) { }

    /**
     * Sets the length of time (in seconds) that the JWT is valid, which affects the expiration (exp) claim. Returned by the getValidityLength method. This method returns a NoAccess exception for JWTs generated using methods in the Auth.JWTUtil class. For these JWTs, the incoming JWT determines the validity length.
     */
    global void setValidityLength(Integer validityLength) { }

    /**
     * Generates the JSON object representation of the Claims Set as an encoded JWT payload.
     */
    global String toJSONString() { return null; }

    global override virtual String toString() { return null; }
}