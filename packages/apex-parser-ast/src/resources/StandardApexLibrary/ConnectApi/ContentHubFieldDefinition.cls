/**
 * A field definition.
 */
global class ContentHubFieldDefinition {

  /**
   * Label or caption of this field.
   */
  global String displayName;

  /**
   * Specifies whether this field is mandatory for the item type.
   */
  global Boolean isMandatory;

  /**
   * Maximum length of the value of this field.
   */
  global Integer maxLength;

  /**
   * Name of the field.
   */
  global String name;

  /**
   * Data type of the value of the field. Values are: BooleanType DateTimeType DecimalType HtmlType IdType IntegerType StringType UriType XmlType
   */
  global ConnectApi.ContentHubVariableType type;

}