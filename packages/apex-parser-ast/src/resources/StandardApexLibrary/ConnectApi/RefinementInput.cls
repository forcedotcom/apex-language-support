/**
 * Attribute-based refinement input for product search.
 */
global class RefinementInput {

  global RefinementInput() {}

  /**
   * Search attribute type. Custom ProductAttribute Standard
   */
  global ConnectApi.CommerceSearchAttributeType attributeType;

  /**
   * Developer name of the attribute. In version 52.0 and later, the ID of the attribute isn’t supported.
   */
  global String nameOrId;

  /**
   * Search facet type. Value is: DistinctValue Range
   */
  global ConnectApi.CommerceSearchFacetType type;

  global Object clone() {}

  global ConnectApi.CommerceSearchAttributeType getAttributeType() {}

  global String getNameOrId() {}

  global ConnectApi.CommerceSearchFacetType getType() {}

  global void setAttributeType(ConnectApi.CommerceSearchAttributeType value) {}

  global void setNameOrId(String value) {}

  global void setType(ConnectApi.CommerceSearchFacetType value) {}

}