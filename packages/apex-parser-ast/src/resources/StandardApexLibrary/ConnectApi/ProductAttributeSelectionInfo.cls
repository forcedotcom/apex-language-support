/**
 * Product attribute.
 */
global class ProductAttributeSelectionInfo {

  global ProductAttributeSelectionInfo() {}

  /**
   * API name of the attribute.
   */
  global String apiName;

  /**
   * Label of the attribute.
   */
  global String label;

  /**
   * Sequence value determined by the order of the attributes under Commerce Setup for the attribute set.
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