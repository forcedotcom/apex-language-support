/**
 * Credential input.
 */
global class CredentialInput {

  /**
   * Authentication protocol of the external credential. Values are: AwsSv4 Basic Custom Jwt OAuth
   */
  global ConnectApi.CredentialAuthenticationProtocol authenticationProtocol;

  /**
   * Authentication protocol variant of the external credential. Values are: AwsSv4_STS —AWS Signature Version 4 with Security Token Service. ClientCredentialsClientSecret —OAuth 2.0 Client Credentials client secret. Client secrets are sent in the callout’s request body. ClientCredentialsClientSecretBasic —OAuth 2.0 Client Credentials client secret. Client secrets are sent in the callout’s authorization header, as with Basic authentication. ClientCredentialsJwtAssertion —OAuth 2.0 Client Credentials JSON Web Token assertion. JwtBearer —OAuth 2.0 JSON Web Token bearer flow. NoAuthentication —No authentication. RolesAnywhere —AWS Signature Version 4 with Identity and Access Management (IAM) Roles Anywhere. If specified, the authentication protocol variant must match the actual protocol variant of the external credential.
   */
  global ConnectApi.CredentialAuthenticationProtocolVariant authenticationProtocolVariant;

  /**
   * Map of protocol-specific credentials. Authentication protocols have credential allowlists and encryption rules. AwsSv4 — awsAccessKeyId (not encrypted), awsSecretAccessKey (encrypted), awsRoleArn (not encrypted) Custom —Any credential name is valid (user sets encryption rules)
   */
  global Map < String , ConnectApi.CredentialValueInput > credentials;

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