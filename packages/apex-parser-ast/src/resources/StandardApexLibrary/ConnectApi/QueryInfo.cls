/**
 * Query execution information.
 */
global class QueryInfo {

  /**
   * Unique identifier assigned to a search query to enable tracking usage and analysis of user interactions with search results.
   */
  global String queryId;

  /**
   * Query execution information for the object.
   */
  global Map < String , ConnectApi.ObjectQueryInfo > sobjects;

  /**
   * Status on the object search such as error messages and warnings.
   */
  global ConnectApi.SearchStatus status;

}