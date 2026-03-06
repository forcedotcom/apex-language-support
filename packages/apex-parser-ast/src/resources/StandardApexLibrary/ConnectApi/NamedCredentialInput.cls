/**
 * Input used to create or update a named credential.
 */
global class NamedCredentialInput {

  /**
   * Callout options.
   */
  global ConnectApi.NamedCredentialCalloutOptionsInput calloutOptions;

  /**
   * URL of the named credential in a callout.
   */
  global String calloutUrl;

  /**
   * Custom HTTP headers.
   */
  global List < ConnectApi.CredentialCustomHeaderInput > customHeaders;

  /**
   * Description of the named credential.
   */
  global String description;

  /**
   * Named credential developer name.
   */
  global String developerName;

  /**
   * External credentials used by the named credential. In version 58.0 and later only one external credential is supported.
   */
  global List < ConnectApi.ExternalCredentialInput > externalCredentials;

  /**
   * Named credential label.
   */
  global String masterLabel;

  /**
   * PrivateConnect outbound network connection.
   */
  global ConnectApi.NetworkConnectionInput networkConnection;

  /**
   * Named credential parameters.
   */
  global List < ConnectApi.NamedCredentialParameterInput > parameters;

  /**
   * Type of named credential. Values are: PrivateEndpoint SecuredEndpoint
   */
  global ConnectApi.NamedCredentialType type;

}