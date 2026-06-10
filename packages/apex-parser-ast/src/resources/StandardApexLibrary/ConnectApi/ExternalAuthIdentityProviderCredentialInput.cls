/**
 * External auth identity provider credential input.
 */
global class ExternalAuthIdentityProviderCredentialInput {

  global ExternalAuthIdentityProviderCredentialInput() {}

  /**
   * Name of the external auth identity provider credential.
   */
  global String credentialName;

  /**
   * Value of the external auth identity provider credential.
   */
  global String credentialValue;

  global Object clone() {}

}