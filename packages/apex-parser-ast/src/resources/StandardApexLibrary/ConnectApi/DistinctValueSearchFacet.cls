/**
 * Facet with distinct values in product search results.
 */
global class DistinctValueSearchFacet extends ConnectApi.SearchFacet {

  global DistinctValueSearchFacet() {}

  /**
   * Values of the facet found in the search result. Sorted by display name in alphabetical order.
   */
  global List < ConnectApi.DistinctFacetValue > values;

  global Object clone() {}

  global ConnectApi.CommerceSearchAttributeType getAttributeType() {}

  global String getDisplayName() {}

  global Integer getDisplayRank() {}

  global ConnectApi.CommerceSearchFacetDisplayType getDisplayType() {}

  global ConnectApi.CommerceSearchFacetType getFacetType() {}

  global String getNameOrId() {}

  global List<ConnectApi.DistinctFacetValue> getValues() {}

  global void setAttributeType(ConnectApi.CommerceSearchAttributeType value) {}

  global void setDisplayName(String value) {}

  global void setDisplayRank(Integer value) {}

  global void setDisplayType(ConnectApi.CommerceSearchFacetDisplayType value) {}

  global void setFacetType(ConnectApi.CommerceSearchFacetType value) {}

  global void setNameOrId(String value) {}

  global void setValues(List<ConnectApi.DistinctFacetValue> value) {}

}