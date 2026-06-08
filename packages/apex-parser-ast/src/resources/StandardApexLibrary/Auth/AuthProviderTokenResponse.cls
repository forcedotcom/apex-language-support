/**
 * Stores the response from the AuthProviderPlugin.handleCallback method.
 */
global class AuthProviderTokenResponse {

  public AuthProviderTokenResponse(String provider, String oauthToken, String oauthSecretOrRefreshToken, String state) {}

  public String oauthSecretOrRefreshToken;

  public String oauthToken;

  public String provider;

  public String state;

  public String idToken;

  global Object clone() {}

}