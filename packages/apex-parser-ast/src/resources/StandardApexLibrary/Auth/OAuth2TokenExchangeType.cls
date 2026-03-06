/**
 * Used during the OAuth 2.0 token exchange flow to specify the type of token that’s being exchanged for a Salesforce token.
 */
global enum OAuth2TokenExchangeType {
  ACCESS_TOKEN,
  ID_TOKEN,
  JWT,
  REFRESH_TOKEN,
  SAML_2
}