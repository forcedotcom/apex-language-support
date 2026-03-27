/**
 * Named credential parameter input.
 */
global class NamedCredentialParameterInput {

  /**
   * ID of the parameter.
   */
  global String id;

  /**
   * Description of the parameter.
   */
  global String parameterDescription;

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