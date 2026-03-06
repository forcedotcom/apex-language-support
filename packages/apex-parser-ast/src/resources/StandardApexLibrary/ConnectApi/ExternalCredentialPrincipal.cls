/**
 * External credential principal.
 */
global class ExternalCredentialPrincipal {

  /**
   * Status of the credential authentication. Values are: Configured —Credential has all required credentials for at least one principal. NotConfigured —Credential isn’t configured. Unknown —Credential status can’t be determined because the authentication protocol is custom.
   */
  global ConnectApi.CredentialAuthenticationStatus authenticationStatus;

  /**
   * ID of the external credential principal.
   */
  global String id;

  /**
   * List of external credential parameters.
   */
  global List < ConnectApi.ExternalCredentialParameter > parameters;

  /**
   * List of access entities associated with the external credential principal.
   */
  global List < ConnectApi.ExternalCredentialPrincipalAccess > principalAccess;

  /**
   * Name of the external credential named principal.
   */
  global String principalName;

  /**
   * Type of credential principal. Values are: AwsStsPrincipal NamedPrincipal PerUserPrincipal
   */
  global ConnectApi.CredentialPrincipalType principalType;

  /**
   * Sequence number of the external credential principal.
   */
  global Integer sequenceNumber;

}