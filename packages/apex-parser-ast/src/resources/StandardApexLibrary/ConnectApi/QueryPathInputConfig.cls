/**
 * Represents the query path configuration input.
 */
global class QueryPathInputConfig {

  global QueryPathInputConfig() {}

  /**
   * List of query path configurations.
   */
  global List < ConnectApi.QueryPathInput > queryPaths;

  global Object clone() {}

}