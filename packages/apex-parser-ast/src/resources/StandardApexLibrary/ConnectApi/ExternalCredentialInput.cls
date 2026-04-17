/**
 * Input used to create or update an external credential.
 */
global class ExternalCredentialInput {

  /**
   * Authentication protocol of the external credential. Values are: AwsSv4 Basic Custom Jwt OAuth
   */
  global ConnectApi.CredentialAuthenticationProtocol authenticationProtocol;

  /**
   * Authentication protocol variant of the external credential. Values are: AwsSv4_STS —AWS Signature Version 4 with Security Token Service. ClientCredentialsClientSecret —OAuth 2.0 Client Credentials client secret. Client secrets are sent in the callout’s request body. ClientCredentialsClientSecretBasic —OAuth 2.0 Client Credentials client secret. Client secrets are sent in the callout’s authorization header, as with Basic authentication. ClientCredentialsJwtAssertion —OAuth 2.0 Client Credentials JSON Web Token assertion. JwtBearer —OAuth 2.0 JSON Web Token bearer flow. NoAuthentication —No authentication. RolesAnywhere —AWS Signature Version 4 with Identity and Access Management (IAM) Roles Anywhere. If specified, the authentication protocol variant must match the actual protocol variant of the external credential.
   */
  global ConnectApi.CredentialAuthenticationProtocolVariant authenticationProtocolVariant;

  /**
   * List of credential custom headers.
   */
  global List < ConnectApi.CredentialCustomHeaderInput > customHeaders;

  /**
   * Fully qualified developer name of the external credential.
   */
  global String developerName;

  /**
   * External credential label.
   */
  global String masterLabel;

  /**
   * List of external credential parameters.
   */
  global List < ConnectApi.ExternalCredentialParameterInput > parameters;

  /**
   * List of principals the credential has.
   */
  global List < ConnectApi.ExternalCredentialPrincipalInput > principals;

}