/**
 * Summary of a product attribute.
 */
global class ProductAttributeSummary {

  global ProductAttributeSummary() {}

  /**
   * API name of the attribute.
   */
  global String apiName;

  /**
   * Display label of the attribute.
   */
  global String label;

  /**
   * Sequence of the attribute in the attribute set.
   */
  global Integer sequence;

  /**
   * Display value of the attribute.
   */
  global String value;

  global Object clone() {}

  global String getApiName() {}

  global String getLabel() {}

  global Integer getSequence() {}

  global String getValue() {}

  global void setApiName(String value) {}

  global void setLabel(String value) {}

  global void setSequence(Integer value) {}

  global void setValue(String value) {}

}