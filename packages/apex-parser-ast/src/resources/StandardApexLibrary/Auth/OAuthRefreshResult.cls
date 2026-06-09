/**
 * Stores the result of an AuthProviderPluginClass refresh method. OAuth authentication flow provides a refresh token that can be used to get a new access token. Access tokens have a limited lifetime as specified by the session timeout value. When an access token expires, use a refresh token to get a new access token.
 */
global class OAuthRefreshResult {

  global OAuthRefreshResult(String accessToken, String refreshToken, String error) {}

  global OAuthRefreshResult(String accessToken, String refreshToken) {}

  global String accessToken;

  global String error;

  global String refreshToken;

  global Object clone() {}

}