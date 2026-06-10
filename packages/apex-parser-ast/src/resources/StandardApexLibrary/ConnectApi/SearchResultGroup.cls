/**
 * Search result group.
 */
global class SearchResultGroup {

  global SearchResultGroup() {}

  /**
   * Object API name.
   */
  global String objectApiName;

  /**
   * List of search results.
   */
  global List < ConnectApi.SearchResult > results;

  global Object clone() {}

}