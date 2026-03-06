/**
 * External credential principal input.
 */
global class ExternalCredentialPrincipalInput {

  /**
   * ID of the principal external credential parameter.
   */
  global String id;

  /**
   * List of external credential parameters.
   */
  global List < ConnectApi.ExternalCredentialParameterInput > parameters;

  /**
   * Principal name.
   */
  global String principalName;

  /**
   * Type of credential principal. Values are: AwsStsPrincipal NamedPrincipal PerUserPrincipal
   */
  global ConnectApi.CredentialPrincipalType principalType;

  /**
   * Sequence number.
   */
  global Integer sequenceNumber;

}