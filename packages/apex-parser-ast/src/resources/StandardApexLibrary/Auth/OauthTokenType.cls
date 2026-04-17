/**
 * Specifies the type of Salesforce-issued OAuth 2.0 token being revoked in the OauthToken.revokeToken method.
 */
global enum OauthTokenType {
  ACCESS_TOKEN,
  DELETE_TOKEN,
  REFRESH_TOKEN,
  ORG_JWT
}