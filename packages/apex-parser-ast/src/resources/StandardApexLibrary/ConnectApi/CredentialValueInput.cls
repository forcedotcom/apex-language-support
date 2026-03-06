/**
 * Credential value input.
 */
global class CredentialValueInput {

  /**
   * Specifies whether the value of the credential is encrypted ( true ) or not ( false ).
   */
  global Boolean encrypted;

  /**
   * Revision number of a short-lived credential, such as OAuthToken. If the provided revision isn’t the latest version, the authentication endpoint refreshes the credential.
   */
  global Integer revision;

  /**
   * Value of the credential.
   */
  global String value;

}