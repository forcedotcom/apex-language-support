/**
 * Facet with distinct values in product search results.
 */
global class DistinctValueSearchFacet {

  /**
   * Values of the facet found in the search result. Sorted by display name in alphabetical order.
   */
  global List < ConnectApi.DistinctFacetValue > values;

}