/**
 * Credential value.
 */
global class CredentialValue {

  /**
   * Specifies whether the credential value is encrypted ( true ) or not ( false ).
   */
  global Boolean encrypted;

  /**
   * Revision number of a short-lived credential.
   */
  global Integer revision;

  /**
   * Value of the credential.
   */
  global String value;

}