/**
 * Results of searching objects using keywords.
 */
global class SearchResultGroups {

  /**
   * All related metadata associated with the objects found in the results.
   */
  global Map < String , ConnectApi.ObjectMetadata > metadata;

  /**
   * Search query execution information.
   */
  global ConnectApi.QueryInfo queryInfo;

  /**
   * Record results from a keyword search.
   */
  global ConnectApi.SearchResultGroup resultGroups;

  /**
   * Record results for the keyword search grouped by object. In version 64.0 and later, use resultGroups for record results.
   */
  global List < ConnectApi.SearchObject > searchObjects;

}