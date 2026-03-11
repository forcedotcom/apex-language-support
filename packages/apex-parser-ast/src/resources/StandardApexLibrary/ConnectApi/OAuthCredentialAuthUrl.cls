/**
 * OAuth authentication URL for a credential.
 */
global class OAuthCredentialAuthUrl {

  /**
   * Authentication URL for the user external credential. Authentication URLs have encoded and escaped special characters. Before using the URL, undo the encoded and escaped characters.
   */
  global String authenticationUrl;

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

}