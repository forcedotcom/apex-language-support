/**
 * External auth identity provider credential.
 */
global class ExternalAuthIdentityProviderCredential {

  /**
   * Name of the external auth identity provider credential.
   */
  global String credentialName;

  /**
   * Value of the external auth identity provider credential.
   */
  global String credentialValue;

  /**
   * Indicates whether the external auth identity provider credential is encrypted ( true ) or not ( false ).
   */
  global Boolean encrypted;

}