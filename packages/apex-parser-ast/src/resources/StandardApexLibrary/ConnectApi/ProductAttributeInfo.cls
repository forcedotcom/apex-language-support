/**
 * Product attribute information.
 */
global class ProductAttributeInfo {

  global ProductAttributeInfo() {}

  /**
   * Active attribute picklist values that can be used to create variations. These values are determined by the order of the picklist values in Object Manager.
   */
  global List < String > allowableValues;

  /**
   * API name of the attribute.
   */
  global String apiName;

  /**
   * Attribute picklist values that are available for the product in the store. These values are sorted by the order of values in the allowableValues property.
   */
  global List < String > availableValues;

  /**
   * Field ID for custom fields or enumeration value for standard fields.
   */
  global String fieldEnumOrId;

  /**
   * Indicates if product variations are grouped by a specific attribute.
   */
  global Boolean isGroupedBy;

  /**
   * Label of the attribute.
   */
  global String label;

  /**
   * Name of the object that contains the field.
   */
  global String objectName;

  /**
   * List of product attribute value metadata.
   */
  global List < ConnectApi.ProductAttributeValueMetadataRepresentation > options;

  /**
   * Sequence value determined by the order of the attributes under Commerce Setup for the attribute set.
   */
  global Integer sequence;

  /**
   * View type for product attributes. Values are: ColorSwatch Dropdown Pill
   */
  global ConnectApi.ProductAttributeViewType viewType;

  global Object clone() {}

  global List<String> getAllowableValues() {}

  global String getApiName() {}

  global List<String> getAvailableValues() {}

  global String getFieldEnumOrId() {}

  global Boolean getGroupedBy() {}

  global String getLabel() {}

  global String getObjectName() {}

  global List<ConnectApi.ProductAttributeValueMetadataRepresentation> getOptions() {}

  global Integer getSequence() {}

  global ConnectApi.ProductAttributeViewType getViewType() {}

  global void setAllowableValues(List<String> value) {}

  global void setApiName(String value) {}

  global void setAvailableValues(List<String> value) {}

  global void setFieldEnumOrId(String value) {}

  global void setGroupedBy(Boolean value) {}

  global void setLabel(String value) {}

  global void setObjectName(String value) {}

  global void setOptions(List<ConnectApi.ProductAttributeValueMetadataRepresentation> value) {}

  global void setSequence(Integer value) {}

  global void setViewType(ConnectApi.ProductAttributeViewType value) {}

}