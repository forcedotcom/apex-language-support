/**
 * Metadata for a product attribute value.
 */
global class ProductAttributeValueMetadataRepresentation {

  /**
   * API Name of the product attribute picklist value. For example, blue__c .
   */
  global String apiName;

  /**
   * Hex code value of a color attribute. For example, #0000FF .
   */
  global String colorHexCode;

  /**
   * Label of the picklist value for a custom field product attribute. For example, Red .
   */
  global String label;

  /**
   * Specifies whether a variation product exists ( true ) or not ( false ).
   */
  global Boolean variantAvailable;

}