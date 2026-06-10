/**
 * Attribute-based refinement with distinct values for product search.
 */
global class DistinctValueRefinementInput extends ConnectApi.RefinementInput {

  global DistinctValueRefinementInput() {}

  /**
   * Comma-separated list of attribute values. It considers attribute labels for localization.
   */
  global List < String > values;

  global Object clone() {}

  global ConnectApi.CommerceSearchAttributeType getAttributeType() {}

  global String getNameOrId() {}

  global ConnectApi.CommerceSearchFacetType getType() {}

  global List<String> getValues() {}

  global void setAttributeType(ConnectApi.CommerceSearchAttributeType value) {}

  global void setNameOrId(String value) {}

  global void setType(ConnectApi.CommerceSearchFacetType value) {}

  global void setValues(List<String> value) {}

}