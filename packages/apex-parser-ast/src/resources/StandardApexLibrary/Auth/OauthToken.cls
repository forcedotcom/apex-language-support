/**
 * Contains a method to revoke OAuth access tokens and refresh tokens. This method supports opaque tokens and JSON Web Token (JWT)-based access tokens, including guest and named user JWT-based access tokens.
 */
global class OauthToken {

  public static Boolean revokeToken(Auth.OauthTokenType type, String authToken) {}

}