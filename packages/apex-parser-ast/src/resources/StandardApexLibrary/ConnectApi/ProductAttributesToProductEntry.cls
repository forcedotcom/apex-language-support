/**
 * Mapping of an attribute value combination to a variation product ID.
 */
global class ProductAttributesToProductEntry {

  /**
   * Attribute API values concatenated with an underscore (_) based on the sequence number of the attributes in the attribute set.
   */
  global String canonicalKey;

  /**
   * Variation product ID for the selection of attributes.
   */
  global String productId;

  /**
   * Ordered list of attribute values and metadata that can be used to form a key that maps to product ID.
   */
  global List < ConnectApi.ProductAttributeSelectionInfo > selectedAttributes;

  /**
   * Variant URL name for the selection of attributes.
   */
  global String urlName;

}