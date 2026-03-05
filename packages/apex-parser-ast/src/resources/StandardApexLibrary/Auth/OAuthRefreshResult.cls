/**
 * Stores the result of an AuthProviderPluginClass refresh method. OAuth authentication flow provides a refresh token that can be used to get a new access token. Access tokens have a limited lifetime as specified by the session timeout value. When an access token expires, use a refresh token to get a new access token.
 */
global class OAuthRefreshResult {

  public OAuthRefreshResult(String accessToken, String refreshToken, String error) {}

  public OAuthRefreshResult(String accessToken, String refreshToken) {}

}