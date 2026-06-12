/**
 * Summary of a product attribute set.
 */
global class ProductAttributeSetSummary {

  global ProductAttributeSetSummary() {}

  /**
   * API name of the attribute set.
   */
  global String apiName;

  /**
   * List of attributes in the attribute set.
   */
  global List < ConnectApi.ProductAttributeSummary > attributes;

  /**
   * Display label of the attribute set.
   */
  global String label;

  global Object clone() {}

  global String getApiName() {}

  global List<ConnectApi.ProductAttributeSummary> getAttributes() {}

  global String getLabel() {}

  global void setApiName(String value) {}

  global void setAttributes(List<ConnectApi.ProductAttributeSummary> value) {}

  global void setLabel(String value) {}

}