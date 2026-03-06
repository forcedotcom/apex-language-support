/**
 * Generates the JSON Claims Set in a JSON Web Token (JWT). The resulting Base64-encoded payload can be passed as an argument to create an instance of the Auth.JWS class.
 */
global class JWT {

  /**
   * Makes a duplicate copy of the JWT object.
   * @return Object
   */
  public Object clone() {}

  /**
   * Returns a map of additional claims in the JWT, where the key string contains the name of the claim, and the value contains the value of the claim.
   * @return Map<String,Object>
   */
  public Map<String,Object> getAdditionalClaims() {}

  /**
   * Returns the audience ( aud ) claim that identifies the intended recipients of the JWT.
   * @return String
   */
  public String getAud() {}

  /**
   * Returns the issuer ( iss ) claim that identifies the issuer of the JWT.
   * @return String
   */
  public String getIss() {}

  /**
   * Returns the not before ( nbf ) claim that identifies the time before which the JWT must not be accepted for processing, while allowing some leeway for clock skew. This method returns a NoAccess exception for JWTs generated using methods in the Auth.JWTUtil class. To return the nbf claim for these JWTs, use the getAdditionalClaims method instead.
   * @return Integer
   */
  public Integer getNbfClockSkew() {}

  /**
   * Returns the subject ( sub ) claim that identifies the current user of the JWT.
   * @return String
   */
  public String getSub() {}

  /**
   * Returns the length of time (in seconds) that the JWT is valid, which affects the expiration ( exp ) claim. This method returns a NoAccess exception for JWTs generated using methods in the Auth.JWTUtil class. To return the validity length for these JWTs, use the getAdditionalClaims method instead.
   * @return Integer
   */
  public Integer getValidityLength() {}

  /**
   * Sets the additional claims in the JWT. Returned by the getAdditionalClaims method.
   * @param additionalClaims 
   */
  public void setAdditionalClaims(Map<String,Object> additionalClaims) {}

  /**
   * Sets the audience ( aud ) claim in the JWT. Returned by the getAud method.
   * @param aud 
   */
  public void setAud(String aud) {}

  /**
   * Sets the issuer ( iss ) claim in the JWT. Returned by the getIss method.
   * @param iss 
   */
  public void setIss(String iss) {}

  /**
   * Sets the not before ( nbf ) claim in the JWT. Returned by the getNbfClockSkew method. This method returns a NoAccess exception for JWTs generated using methods in the Auth.JWTUtil class. For these JWTs, the incoming JWT determines the nbf claim.
   * @param nbfClockSkew 
   */
  public void setNbfClockSkew(Integer nbfClockSkew) {}

  /**
   * Sets the subject ( sub ) claim in the JWT. Returned by the getSub method.
   * @param sub 
   */
  public void setSub(String sub) {}

  /**
   * Sets the length of time (in seconds) that the JWT is valid, which affects the expiration ( exp ) claim. Returned by the getValidityLength method. This method returns a NoAccess exception for JWTs generated using methods in the Auth.JWTUtil class. For these JWTs, the incoming JWT determines the validity length.
   * @param validityLength 
   */
  public void setValidityLength(Integer validityLength) {}

  /**
   * Generates the JSON object representation of the Claims Set as an encoded JWT payload.
   * @return String
   */
  public String toJSONString() {}

}