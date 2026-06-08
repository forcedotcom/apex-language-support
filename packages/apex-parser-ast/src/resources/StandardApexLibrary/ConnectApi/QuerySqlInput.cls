/**
 * Represents the input to create an SQL query.
 */
global class QuerySqlInput {

  global QuerySqlInput() {}

  /**
   * Amount of time (in seconds) for the query engine to respond to the request. 0 will return the queryId, status, and metadata, but no data associated with the SQL. The maximum value is 15 .
   */
  global Integer adaptiveTimeout;

  /**
   * Settings to adjust the query execution behavior: date_style —Order of Year, Month, and Day for parsing date strings, for example MDY and DMY . lc_time —Locale for date literals using ISO language and country code, for example en_US and de_AT . query_timeout —Execution limit in milliseconds before the query is terminated, for example 1800000ms .
   */
  global Map < String , String > querySettings;

  /**
   * Maximum number of rows to include in the response. Fewer rows may be returned.
   */
  global Long rowLimit;

  /**
   * SQL expression.
   */
  global String sql;

  /**
   * Value and type information about the SQL parameters.
   */
  global List < ConnectApi.QuerySqlParameterItem > sqlParameters;

  global Object clone() {}

}