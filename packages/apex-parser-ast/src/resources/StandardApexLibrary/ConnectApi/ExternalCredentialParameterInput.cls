/**
 * External credential parameter input.
 */
global class ExternalCredentialParameterInput {

  /**
   * Parameter ID.
   */
  global String id;

  /**
   * Parameter description.
   */
  global String parameterDescription;

  /**
   * Parameter name of the external credential.
   */
  global String parameterName;

  /**
   * Parameter type of the external credential. Values are: AdditionalRefreshStatusCode AuthParameter AuthProvider AuthProviderUrl AuthProviderUrlQueryParameter JwtBodyClaim JwtHeaderClaim ManagedByComponent ManagedByFeature SigningCertificate
   */
  global ConnectApi.ExternalCredentialParameterType parameterType;

  /**
   * Parameter value of the external credential.
   */
  global String parameterValue;

}