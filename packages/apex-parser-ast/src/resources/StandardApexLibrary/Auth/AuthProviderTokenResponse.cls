/**
 * Stores the response from the AuthProviderPlugin.handleCallback method.
 */
global class AuthProviderTokenResponse {

  global AuthProviderTokenResponse(String provider, String oauthToken, String oauthSecretOrRefreshToken, String state) {}

  global String oauthSecretOrRefreshToken;

  global String oauthToken;

  global String provider;

  global String state;

  global String idToken;

  global Object clone() {}

}