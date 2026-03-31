/**
 * Represents the activation attribute output.
 */
global class ActivationAttribute {

  /**
   * ID of the activation platform attribute.
   */
  global String activationPlatformAttrId;

  /**
   * Label of the activation attribute.
   */
  global String attributeLabel;

  /**
   * Name of the activation attribute.
   */
  global String attributeName;

  /**
   * Curated ID field for the activation attribute.
   */
  global String curatedFieldId;

  /**
   * Data source type for the activation attribute.
   */
  global String dataSourceType;

  /**
   * Entity name of the activation attribute.
   */
  global String entityName;

  /**
   * Filter expression for the activation attribute.
   */
  global ConnectApi.AttributeFilterExpression filterExpression;

  /**
   * Query path for the activation attributes.
   */
  global List < ConnectApi.QueryPathConfigList > path;

  /**
   * Preferred name of the activation attribute.
   */
  global String preferredName;

  /**
   * Developer name of the referrence attribute.
   */
  global String refAttrDeveloperName;

  /**
   * Activation attribute source. Direct Related
   */
  global DataExportAttributeSourceEnum source;

  /**
   * Type of activation attribute. Computed_Dimension Computed_Measure Model Model_Related Non_Aggregatable_Computed_Measure
   */
  global DataExportAttributeTypeEnum type;

}