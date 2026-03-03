/**
 * Contains methods that describe the result of the token validation performed by a token exchange handler using the validateIncomingToken method in the Auth.Oauth2TokenExchangeHandler class during the OAuth 2.0 token exchange flow.
 */
global class TokenValidationResult {

  public String getCustomErrorMessage() {}

  public Object getData() {}

  public String getToken() {}

  public Auth.OAuth2TokenExchangeType getTokenType() {}

  public Auth.UserData getUserData() {}

}