/**
 * Credential.
 */
global class Credential {

  /**
   * Authentication protocol of the external credential. Values are: AwsSv4 Basic Custom Jwt OAuth
   */
  global ConnectApi.CredentialAuthenticationProtocol authenticationProtocol;

  /**
   * Authentication protocol variant of the external credential. Values are: AwsSv4_STS —AWS Signature Version 4 with Security Token Service. ClientCredentialsClientSecret —OAuth 2.0 Client Credentials client secret. Client secrets are sent in the callout’s request body. ClientCredentialsClientSecretBasic —OAuth 2.0 Client Credentials client secret. Client secrets are sent in the callout’s authorization header, as with Basic authentication. ClientCredentialsJwtAssertion —OAuth 2.0 Client Credentials JSON Web Token assertion. JwtBearer —OAuth 2.0 JSON Web Token bearer flow. NoAuthentication —No authentication. RolesAnywhere —AWS Signature Version 4 with Identity and Access Management (IAM) Roles Anywhere.
   */
  global ConnectApi.CredentialAuthenticationProtocolVariant authenticationProtocolVariant;

  /**
   * Status of the credential authentication. Values are: Configured —Credential has all required credentials for at least one principal. NotConfigured —Credential isn’t configured. Unknown —Credential status can’t be determined because the authentication protocol is custom.
   */
  global ConnectApi.CredentialAuthenticationStatus authenticationStatus;

  /**
   * Map of protocol-specific credentials.
   */
  global Map < String , ConnectApi.CredentialValue > credentials;

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