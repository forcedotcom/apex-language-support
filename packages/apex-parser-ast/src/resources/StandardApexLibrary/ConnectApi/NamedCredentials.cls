/**
 * Create, refresh, get, delete, replace, and update credentials. Create and get external credentials. Create and get named credentials. Create, get, delete, and update external auth identity providers. Get the URL for the OAuth token flow for an external credential.
 */
global class NamedCredentials {

  public static ConnectApi.Credential createCredential(ConnectApi.CredentialInput requestBody) {}

  public static ConnectApi.Credential createCredential(ConnectApi.CredentialInput requestBody, ConnectApi.CreateCredentialAction action) {}

  public static ConnectApi.ExternalAuthIdentityProvider createExternalAuthIdentityProvider(ConnectApi.ExternalAuthIdentityProviderInput requestBody) {}

  public static ConnectApi.ExternalAuthIdentityProviderCredentials createExternalAuthIdentityProviderCredentials(String fullName, ConnectApi.ExternalAuthIdentityProviderCredentialsInput requestBody) {}

  public static ConnectApi.ExternalCredential createExternalCredential(ConnectApi.ExternalCredentialInput requestBody) {}

  public static ConnectApi.NamedCredential createNamedCredential(ConnectApi.NamedCredentialInput requestBody) {}

  public static void deleteCredential(String externalCredential, String principalName, ConnectApi.CredentialPrincipalType principalType) {}

  public static void deleteCredential(String externalCredential, String principalName, ConnectApi.CredentialPrincipalType principalType, List<String> authenticationParameters) {}

  public static void deleteExternalAuthIdentityProvider(String developerName) {}

  public static void deleteExternalCredential(String developerName) {}

  public static void deleteNamedCredential(String developerName) {}

  public static ConnectApi.Credential getCredential(String externalCredential, String principalName, ConnectApi.CredentialPrincipalType principalType) {}

  public static ConnectApi.ExternalAuthIdentityProvider getExternalAuthIdentityProvider(String fullName) {}

  public static ConnectApi.ExternalAuthIdentityProviderCredentials getExternalAuthIdentityProviderCredentials(String fullName) {}

  public static ConnectApi.ExternalAuthIdentityProviderList getExternalAuthIdentityProviders() {}

  public static ConnectApi.ExternalCredential getExternalCredential(String developerName) {}

  public static ConnectApi.ExternalCredentialList getExternalCredentials() {}

  public static ConnectApi.NamedCredential getNamedCredential(String developerName) {}

  public static ConnectApi.NamedCredentialList getNamedCredentials() {}

  public static ConnectApi.OAuthCredentialAuthUrl getOAuthCredentialAuthUrl(ConnectApi.OAuthCredentialAuthUrlInput requestBody) {}

  public static ConnectApi.Credential patchCredential(ConnectApi.CredentialInput requestBody) {}

  public static ConnectApi.Credential updateCredential(ConnectApi.CredentialInput requestBody) {}

  public static ConnectApi.ExternalAuthIdentityProvider updateExternalAuthIdentityProvider(String developerName, ConnectApi.ExternalAuthIdentityProviderInput requestBody) {}

  public static ConnectApi.ExternalAuthIdentityProviderCredentials updateExternalAuthIdentityProviderCredentials(String fullName, ConnectApi.ExternalAuthIdentityProviderCredentialsInput requestBody) {}

  public static ConnectApi.ExternalCredential updateExternalCredential(String developerName, ConnectApi.ExternalCredentialInput requestBody) {}

  public static ConnectApi.NamedCredential updateNamedCredential(String developerName, ConnectApi.NamedCredentialInput requestBody) {}

}