/**
 * Mapping of an attribute value combination to a variation product ID.
 */
global class ProductAttributesToProductEntry {

  global ProductAttributesToProductEntry() {}

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

  global Object clone() {}

  global String getCanonicalKey() {}

  global ConnectApi.ProductMedia getImage() {}

  global List<ConnectApi.ProductMedia> getMediaItems() {}

  global String getProductId() {}

  global List<ConnectApi.ProductAttributeSelectionInfo> getSelectedAttributes() {}

  global String getUrlName() {}

  global void setCanonicalKey(String value) {}

  global void setImage(ConnectApi.ProductMedia value) {}

  global void setMediaItems(List<ConnectApi.ProductMedia> value) {}

  global void setProductId(String value) {}

  global void setSelectedAttributes(List<ConnectApi.ProductAttributeSelectionInfo> value) {}

  global void setUrlName(String value) {}

}