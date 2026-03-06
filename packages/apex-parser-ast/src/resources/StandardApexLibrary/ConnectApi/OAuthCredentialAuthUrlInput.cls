/**
 * OAuth authentication flow.
 */
global class OAuthCredentialAuthUrlInput {

  /**
   * Fully qualified developer name of the external credential.
   */
  global String externalCredential;

  /**
   * Name of the external credential named principal.
   */
  global String principalName;

  /**
   * Type of credential principal. Values are: AwsStsPrincipal NamedPrincipal PerUserPrincipal
   */
  global ConnectApi.CredentialPrincipalType principalType;

  /**
   * Return URL to apply to the authentication URL.
   */
  global String returnUrl;

}