/**
 * Used during the OAuth 2.0 token exchange flow to specify the type of token that’s being exchanged for a Salesforce token.
 * Usage
 * During the token exchange flow, your app requests a token from Salesforce by sending a POST request with a token from an external identity provider. The request includes a subject_token_type parameter to specify the type of token. The values specified in this enum must correspond to the subject_token_type in the token request.
 * Enum Values
 * The following are the values of the Auth.OAuth2TokenExchangeType enum.
 */
global enum OAuth2TokenExchangeType {
    ACCESS_TOKEN,
    ID_TOKEN,
    JWT,
    REFRESH_TOKEN,
    SAML_2

}