/**
 * Represents a query path configuration.
 */
global class QueryPathConfig {

  global QueryPathConfig() {}

  /**
   * Query path.
   */
  global List < ConnectApi.QueryPath > queryPath;

  global Object clone() {}

}