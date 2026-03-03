/**
 * Contains methods that POST the signed JWT bearer token to a token endpoint to request an access token, in the OAuth 2.0 JWT bearer token flow.
 */
global class JWTBearerTokenExchange {

  /**
   * Makes a duplicate copy of the JWTBearerTokenExchange object.
   * @return Object
   */
  public Object clone() {}

  /**
   * Returns the access_token in the token response to the JWT bearer token request.
   * @return String
   */
  public String getAccessToken() {}

  /**
   * Returns the grant type specified in the JWT bearer token request. The grant type value defaults to urn:ietf:params:oauth:grant-type:jwt-bearer .
   * @return String
   */
  public String getGrantType() {}

  /**
   * Returns the full System.HttpResponse token response to the JWT bearer token request.
   * @return System.HttpResponse
   */
  public System.HttpResponse getHttpResponse() {}

  /**
   * Returns the JWS specified in the JWT bearer token request.
   * @return Auth.JWS
   */
  public Auth.JWS getJWS() {}

  /**
   * Returns the token endpoint that the JWT bearer token request is POSTed to.
   * @return String
   */
  public String getTokenEndpoint() {}

  /**
   * Sets the grant type in the JWT bearer token request. Returned by the getGrantType() method.
   * @param grantType 
   */
  public void setGrantType(String grantType) {}

  /**
   * Sets the JWS in the JWT bearer token request. Returned by the getJWS() method.
   * @param jws 
   */
  public void setJWS(Auth.JWS jws) {}

  /**
   * Sets the token endpoint that the JWT bearer token request is POSTed to. Returned by the getTokenEndpoint() method.
   * @param tokenEndpoint 
   */
  public void setTokenEndpoint(String tokenEndpoint) {}

}