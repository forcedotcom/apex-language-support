/**
 * External credential, including the named credentials and principals associated with it and the type and status of each principal.
 */
global class ExternalCredential {

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
   * Namespace of the package that created the external credential.
   */
  global String createdByNamespace;

  /**
   * List of custom headers.
   */
  global List < ConnectApi.CredentialCustomHeader > customHeaders;

  /**
   * Fully qualified developer name of the external credential.
   */
  global String developerName;

  /**
   * External credential ID.
   */
  global String id;

  /**
   * External credential label.
   */
  global String masterLabel;

  /**
   * List of parameters of the external credential.
   */
  global List < ConnectApi.ExternalCredentialParameter > parameters;

  /**
   * List of principals the credential has.
   */
  global List < ConnectApi.ExternalCredentialPrincipal > principals;

  /**
   * List of named credentials associated to the external credential.
   */
  global List < ConnectApi.NamedCredential > relatedNamedCredentials;

  /**
   * Connect REST API URL for the external credential.
   */
  global String url;

}