/**
 * Represents information about an activation external platform.
 */
global class ActivationExternalPlatform {

  global ActivationExternalPlatform() {}

  /**
   * Attribute configuration for the external platform.
   */
  global ConnectApi.ActivationExternalPlatformAttributeConfig attributeConfig;

  /**
   * User who created the external platform.
   */
  global ConnectApi.CdpUser createdBy;

  /**
   * When the external platform was created.
   */
  global String createdDate;

  /**
   * Creation type of the external platform. Json Manual
   */
  global ActivationPlatformCreationTypeEnum creationType;

  /**
   * The 18-character ID of the external platform.
   */
  global String id;

  /**
   * Namespace prefix of the external platform.
   */
  global String keyPrefixName;

  /**
   * Label of the external platform.
   */
  global String label;

  /**
   * User who last modified the external platform.
   */
  global ConnectApi.CdpUser lastModifiedBy;

  /**
   * When the external platform was last modified.
   */
  global String lastModifiedDate;

  /**
   * Name of the external platform.
   */
  global String name;

  /**
   * Name space of the external platform.
   */
  global String namespace;

  /**
   * Privacy type of the external platform. NotApplicable ServiceProvider ThirdParty UpdateFailed
   */
  global ActivationPlatformPrivacyTypeEnum privacyType;

  /**
   * Status of the external platform. Active Error Inactive Processing
   */
  global ActivationPlatformStatusEnum status;

  /**
   * Platform type of the external platform. Advertising Analytics Marketing Publishing Technology
   */
  global ActivationPlatformTypeEnum type;

  /**
   * URL of the external platform.
   */
  global String url;

  global Object clone() {}

}