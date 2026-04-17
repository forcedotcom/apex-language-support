/**
 * External auth identity provider parameter.
 */
global class ExternalAuthIdentityProviderParameter {

  /**
   * The name of the external auth identity provider parameter.
   */
  global String parameterName;

  /**
   * Parameter type for an external auth identity provider. Values are: AuthorizeRequestQueryParameter IdentityProviderOptions ManagedByComponent ManagedByFeature RefreshRequestBodyParameter RefreshRequestHttpHeader RefreshRequestQueryParameter TokenRequestBodyParameter TokenRequestHttpHeader TokenRequestQueryParameter
   */
  global ConnectApi.ExternalAuthIdentityProviderParameterType parameterType;

  /**
   * If parameterType describes a literal value then the literal value is stored in this property.
   */
  global String parameterValue;

  /**
   * Specifies the order of parameters to apply when an external auth identity provider has more than one parameter. Priority is from lower to higher numbers, for example, 1 is the highest priority.
   */
  global Integer sequenceNumber;

}