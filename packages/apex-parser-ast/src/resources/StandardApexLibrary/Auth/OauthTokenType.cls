/**
 * Specifies the type of Salesforce-issued OAuth 2.0 token being revoked in the OauthToken.revokeToken method.
 * Enum Values
 * The following are the values of the Auth.OauthTokenType enum.
 */
global enum OauthTokenType {
    ACCESS_TOKEN,
    DELETE_TOKEN,
    ORG_JWT,
    REFRESH_TOKEN

}