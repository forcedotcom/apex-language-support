/**
 * Represents an activation target.
 */
global class ActivationTarget {

  /**
   * Details about the connector that is used for the activation target.
   */
  global ConnectApi.DataConnector connector;

  /**
   * Data space name for the activation target.
   */
  global String dataSpace;

  /**
   * Description of the activation target.
   */
  global String description;

  /**
   * Egress properties for the activation target, which are applicable only for file-based activation targets.
   */
  global ConnectApi.EgressPropertiesRepresentation egressProperties;

  /**
   * API name for the history audience DMO.
   */
  global String historyAudienceDmoApiName;

  /**
   * Name of the history audience DMO.
   */
  global String historyAudienceDmoLabel;

  /**
   * Indicates whether communication capping is enabled for the activation ( true ) or not ( false ) .
   */
  global Boolean isCappingEnabled;

  /**
   * Indicates whether the activation target is enabled ( true ) or not ( false ) .
   */
  global Boolean isEnabled;

  /**
   * API name for the latest audience DMO.
   */
  global String latestAudienceDmoApiName;

  /**
   * Name of the latest audience DMO.
   */
  global String latestAudienceDmoLabel;

  /**
   * Organization ID of the activation target.
   */
  global String organizationId;

  /**
   * Platform name for the activation target.
   */
  global String platformName;

  /**
   * Platform privacy type for the activation target. Derived from Activation Platform.
   */
  global String platformPrivacyType;

  /**
   * Data connector type of the activation target. AmazonS3 AzureBlob DataCloud GoogleCloudStorage SalesforceMarketingCloud Sftp
   */
  global DataConnectorTypeEnum platformType;

  /**
   * Status of the activation target. Active Processing Error Inactive
   */
  global ActivationTargetStatusEnum status;

}