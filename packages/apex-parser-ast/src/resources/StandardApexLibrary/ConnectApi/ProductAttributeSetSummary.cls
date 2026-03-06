/**
 * Summary of a product attribute set.
 */
global class ProductAttributeSetSummary {

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

}