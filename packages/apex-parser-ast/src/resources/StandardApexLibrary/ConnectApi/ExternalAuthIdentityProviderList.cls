/**
 * List of external auth identity providers in the org.
 */
global class ExternalAuthIdentityProviderList {

  global ExternalAuthIdentityProviderList() {}

  /**
   * List of external auth identity providers.
   */
  global List < ConnectApi.ExternalAuthIdentityProvider > externalAuthIdentityProviders;

  global Object clone() {}

}