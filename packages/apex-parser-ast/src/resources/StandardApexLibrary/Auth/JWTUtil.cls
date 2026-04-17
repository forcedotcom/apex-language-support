/**
 * Contains methods for validating a JSON Web Token (JWT) from an external identity provider as part of the OAuth 2.0 token exchange flow. Use these methods as part of the validateIncomingToken method in the Auth.Oauth2TokenExchangeHandler class.
 */
global class JWTUtil {

  public static Auth.JWT parseJWTFromStringWithoutValidation(String incomingJWT) {}

  public static Auth.JWT validateJWTWithCert(String incomingJWT, String certDeveloperName) {}

  public static Auth.JWT validateJWTWithKey(String incomingJWT, String publicKey) {}

  public static Auth.JWT validateJWTWithKeysEndpoint(String incomingJWT, String keysEndpoint, Boolean shouldUseCache) {}

}