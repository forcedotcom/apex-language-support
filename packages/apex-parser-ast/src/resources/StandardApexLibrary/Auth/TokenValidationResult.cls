/**
 * Contains methods that describe the result of the token validation performed by a token exchange handler using the validateIncomingToken method in the Auth.Oauth2TokenExchangeHandler class during the OAuth 2.0 token exchange flow.
 */
global class TokenValidationResult {

  global TokenValidationResult(Boolean isValid, Object data, Auth.UserData userData, String token, Auth.OAuth2TokenExchangeType tokenType, String customErrorMsg) {}

  global TokenValidationResult(Boolean valid) {}

  global String customErrorMsg;

  global Object data;

  global Boolean isValid;

  global String token;

  global Auth.OAuth2TokenExchangeType tokenType;

  global Auth.UserData userData;

  global String getCustomErrorMessage() {}

  global Object getData() {}

  global String getToken() {}

  global Auth.OAuth2TokenExchangeType getTokenType() {}

  global Auth.UserData getUserData() {}

  global Object clone() {}

  global Boolean isValid() {}

}