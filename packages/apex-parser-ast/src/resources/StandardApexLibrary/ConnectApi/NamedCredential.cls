/**
 * Named credential associated with an external credential.
 */
global class NamedCredential {

  /**
   * Callout options for the named credential.
   */
  global ConnectApi.NamedCredentialCalloutOptions calloutOptions;

  /**
   * Indicates whether a named credential is enabled for callout. Values are: Disabled Enabled
   */
  global ConnectApi.CalloutStatus calloutStatus;

  /**
   * URL of the named credential in a callout.
   */
  global String calloutUrl;

  /**
   * Namespace of the package that created the named credential.
   */
  global String createdByNamespace;

  /**
   * Custom HTTP headers for the named credential.
   */
  global List < ConnectApi.CredentialCustomHeader > customHeaders;

  /**
   * Description of the named credential.
   */
  global String description;

  /**
   * Fully qualified developer name of the named credential.
   */
  global String developerName;

  /**
   * External credentials used by the named credential.
   */
  global List < ConnectApi.ExternalCredential > externalCredentials;

  /**
   * Named credential ID.
   */
  global String id;

  /**
   * Named credential label.
   */
  global String masterLabel;

  /**
   * PrivateConnect outbound network connection for the named credential.
   */
  global ConnectApi.NetworkConnection networkConnection;

  /**
   * Named credential parameters.
   */
  global List < ConnectApi.NamedCredentialParameter > parameters;

  /**
   * Type of named credential. Values are: PrivateEndpoint SecuredEndpoint
   */
  global ConnectApi.NamedCredentialType type;

  /**
   * Connect REST API URL of the named credential.
   */
  global String url;

}