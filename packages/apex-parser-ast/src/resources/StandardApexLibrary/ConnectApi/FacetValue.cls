/**
 * Facet value.
 */
global class FacetValue {

  global FacetValue() {}

  /**
   * Search facet type. Value is: DistinctValue Range
   */
  global ConnectApi.CommerceSearchFacetType type;

  global Object clone() {}

  global ConnectApi.CommerceSearchFacetType getType() {}

  global void setType(ConnectApi.CommerceSearchFacetType value) {}

}