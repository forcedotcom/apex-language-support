/**
 * Input details for the activation target.
 */
global class ActivationTargetInput {

  /**
   * Details about the connector for the activation target.
   */
  global ConnectApi.DataConnectorInput connector;

  /**
   * Data space name for the activation target.
   */
  global String dataSpaceName;

  /**
   * Description of the activation target.
   */
  global String description;

  /**
   * Egress properties for the activation target, which are applicable only for file-based activation targets.
   */
  global ConnectApi.EgressPropertiesInput egressProperties;

  /**
   * Indicates whether communication capping is enabled for the activation target ( true ) or not ( false ) .
   */
  global Boolean isCappingEnabled;

  /**
   * Name of the activation target.
   */
  global String name;

  /**
   * Data connector type of the activation target. AmazonS3 AzureBlob DataCloud GoogleCloudStorage SalesforceMarketingCloud Sftp
   */
  global DataConnectorTypeEnum platformType;

}