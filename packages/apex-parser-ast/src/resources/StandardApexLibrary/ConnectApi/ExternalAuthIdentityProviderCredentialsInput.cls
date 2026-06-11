/**
 * External auth identity provider credentials input.
 */
global class ExternalAuthIdentityProviderCredentialsInput {

  global ExternalAuthIdentityProviderCredentialsInput() {}

  /**
   * List of external auth identity provider credentials to populate.
   */
  global List < ConnectApi.ExternalAuthIdentityProviderCredentialInput > credentials;

  global Object clone() {}

}