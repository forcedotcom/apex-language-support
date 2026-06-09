/**
 * Create, refresh, get, delete, replace, and update credentials. Create and get external credentials. Create and get named credentials. Create, get, delete, and update external auth identity providers. Get the URL for the OAuth token flow for an external credential.
 */
global class NamedCredentials {

  global NamedCredentials() {}

  global static ConnectApi.Credential createCredential(ConnectApi.CredentialInput requestBody) {}

  global static ConnectApi.Credential createCredential(ConnectApi.CredentialInput requestBody, ConnectApi.CreateCredentialAction action) {}

  global static ConnectApi.ExternalAuthIdentityProvider createExternalAuthIdentityProvider(ConnectApi.ExternalAuthIdentityProviderInput requestBody) {}

  global static ConnectApi.ExternalAuthIdentityProviderCredentials createExternalAuthIdentityProviderCredentials(String fullName, ConnectApi.ExternalAuthIdentityProviderCredentialsInput requestBody) {}

  global static ConnectApi.ExternalCredential createExternalCredential(ConnectApi.ExternalCredentialInput requestBody) {}

  global static ConnectApi.NamedCredential createNamedCredential(ConnectApi.NamedCredentialInput requestBody) {}

  global static void deleteCredential(String externalCredential, String principalName, ConnectApi.CredentialPrincipalType principalType) {}

  global static void deleteCredential(String externalCredential, String principalName, ConnectApi.CredentialPrincipalType principalType, List<String> authenticationParameters) {}

  global static void deleteExternalAuthIdentityProvider(String developerName) {}

  global static void deleteExternalCredential(String developerName) {}

  global static void deleteNamedCredential(String developerName) {}

  global static ConnectApi.Credential getCredential(String externalCredential, String principalName, ConnectApi.CredentialPrincipalType principalType) {}

  global static ConnectApi.ExternalAuthIdentityProvider getExternalAuthIdentityProvider(String fullName) {}

  global static ConnectApi.ExternalAuthIdentityProviderCredentials getExternalAuthIdentityProviderCredentials(String fullName) {}

  global static ConnectApi.ExternalAuthIdentityProviderList getExternalAuthIdentityProviders() {}

  global static ConnectApi.ExternalCredential getExternalCredential(String developerName) {}

  global static ConnectApi.ExternalCredentialList getExternalCredentials() {}

  global static ConnectApi.NamedCredential getNamedCredential(String developerName) {}

  global static ConnectApi.NamedCredentialList getNamedCredentials() {}

  global static ConnectApi.OAuthCredentialAuthUrl getOAuthCredentialAuthUrl(ConnectApi.OAuthCredentialAuthUrlInput requestBody) {}

  global static ConnectApi.Credential patchCredential(ConnectApi.CredentialInput requestBody) {}

  global static ConnectApi.Credential updateCredential(ConnectApi.CredentialInput requestBody) {}

  global static ConnectApi.ExternalAuthIdentityProvider updateExternalAuthIdentityProvider(String developerName, ConnectApi.ExternalAuthIdentityProviderInput requestBody) {}

  global static ConnectApi.ExternalAuthIdentityProviderCredentials updateExternalAuthIdentityProviderCredentials(String fullName, ConnectApi.ExternalAuthIdentityProviderCredentialsInput requestBody) {}

  global static ConnectApi.ExternalCredential updateExternalCredential(String developerName, ConnectApi.ExternalCredentialInput requestBody) {}

  global static ConnectApi.NamedCredential updateNamedCredential(String developerName, ConnectApi.NamedCredentialInput requestBody) {}

  global Object clone() {}

}