/**
 * External credential parameter.
 */
global class ExternalCredentialParameter {

  /**
   * Parameter ID.
   */
  global String id;

  /**
   * Parameter description.
   */
  global String parameterDescription;

  /**
   * Parameter name. If the parameterType is AuthParameter , valid values are: AwsAccountId —Valid for AwsSv4. AwsProfileArn —Valid for AwsSv4 with RolesAnywhere. AwsRegion —Valid for AwsSv4. AwsService —Valid for AwsSv4. AwsStsDuration —Valid for AwsSv4 with STS or RolesAnywhere. AwsStsExternalId —Valid for AwsSv4 with STS. AwsTrustAnchorArn —Valid for AwsSv4 with RolesAnywhere. Scope —Valid for OAuth. Other parameter types can be any value.
   */
  global String parameterName;

  /**
   * Parameter type of the external credential. Values are: AdditionalRefreshStatusCode AuthParameter AuthProvider AuthProviderUrl AuthProviderUrlQueryParameter JwtBodyClaim JwtHeaderClaim ManagedByComponent ManagedByFeature SigningCertificate
   */
  global ConnectApi.ExternalCredentialParameterType parameterType;

  /**
   * Parameter value. If the parameterType is JwtBodyClaim or JwtHeaderClaim , the parameter value can contain formulas. If the parameterType is AuthProvider or SigningCertificate , the parameter value is the fully qualified entity name of the corresponding entity.
   */
  global String parameterValue;

}