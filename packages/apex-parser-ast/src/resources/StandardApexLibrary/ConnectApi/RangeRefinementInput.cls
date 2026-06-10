/**
 * Attribute-based refinement with minimum or maximum numeric values for product search.
 */
global class RangeRefinementInput {

  global RangeRefinementInput() {}

  /**
   * Type of search attribute for the refinement. Values are: Custom Standard PricebookEntry
   */
  global String attributeType;

  /**
   * Maximum value for range refinement.
   */
  global String max;

  /**
   * Minimum value for range refinement.
   */
  global String min;

  /**
   * Developer name of the attribute for the refinement.
   */
  global String nameOrId;

  /**
   * Type of the refinement. Values is: Range
   */
  global String type;

  global Object clone() {}

  global ConnectApi.CommerceSearchAttributeType getAttributeType() {}

  global String getMax() {}

  global String getMin() {}

  global String getNameOrId() {}

  global ConnectApi.CommerceSearchFacetType getType() {}

  global void setAttributeType(ConnectApi.CommerceSearchAttributeType value) {}

  global void setMax(String value) {}

  global void setMin(String value) {}

  global void setNameOrId(String value) {}

  global void setType(ConnectApi.CommerceSearchFacetType value) {}

}