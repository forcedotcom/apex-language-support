/**
 * Represents the additional attributes configuration for the market segment activation input.
 */
global class ActivationAdditionalAttributesConfigInput {

  /**
   * Activation platform attribute ID.
   */
  global String activationPlatformAttrId;

  /**
   * Type of data source.
   */
  global String dataSourceType;

  /**
   * Name of the entity.
   */
  global String entityName;

  /**
   * Attribute filter expression.
   */
  global List < ConnectApi.AttributeFilterInput > filterExpression;

  /**
   * Indicates whether the attribute can roll up ( true ) or not ( false ).
   */
  global Boolean isRolluppable;

  /**
   * Label of the attribute.
   */
  global String label;

  /**
   * Name of the attribute.
   */
  global String name;

  /**
   * Preferred name of the attribute.
   */
  global String preferredName;

  /**
   * Query path from the activateOn entity to the additional attribute entity.
   */
  global List < ConnectApi.QueryPathInputConfig > queryPathConfig;

  /**
   * Developer name of the reference attribute.
   */
  global String referenceAttributeName;

  /**
   * Activation attribute source. Direct Related
   */
  global DataExportAttributeSourceEnum source;

  /**
   * Type of activation attribute. Computed_Dimension Computed_Measure Model Model_Related Non_Aggregatable_Computed_Measure
   */
  global DataExportAttributeTypeEnum type;

}