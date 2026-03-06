/**
 * Keyword search results for an object.
 */
global class ScopedSearchResults {

  /**
   * All search metadata associated with the object.
   */
  global ConnectApi.ObjectMetadata metadata;

  /**
   * Query execution information for the object.
   */
  global ConnectApi.ObjectQueryInfo objectQueryInfo;

  /**
   * Unique identifier assigned to a search query to enable tracking usage and analysis of user interactions with search results.
   */
  global String queryId;

  /**
   * Record results for the keyword search.
   */
  global List < ConnectApi.SearchResult > results;

  /**
   * Record results for the keyword search. In version 64.0 and later, use results for record results.
   */
  global ConnectApi.SearchObject searchObject;

}