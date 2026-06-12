/**
 * List of an external auth identity provider's credentials.
 */
global class ExternalAuthIdentityProviderCredentials {

  global ExternalAuthIdentityProviderCredentials() {}

  /**
   * List of external auth identity provider credentials.
   */
  global List < ConnectApi.ExternalAuthIdentityProviderCredential > credentials;

  global Object clone() {}

}