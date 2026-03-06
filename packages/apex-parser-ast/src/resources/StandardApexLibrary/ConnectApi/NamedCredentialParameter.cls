/**
 * Named credential parameter.
 */
global class NamedCredentialParameter {

  /**
   * ID of the parameter.
   */
  global String id;

  /**
   * Name of the parameter.
   */
  global String parameterName;

  /**
   * Type of named credential parameter. Values are: AllowedManagedPackageNamespaces ClientCertificate ConnectionStatus
   */
  global ConnectApi.NamedCredentialParameterType parameterType;

  /**
   * Value of the parameter.
   */
  global String parameterValue;

}