/**
 * Represents the input to create an SQL query.
 */
global class QuerySqlInput {

  /**
   * Amount of time (in seconds) for the query engine to respond to the request. 0 will return the queryId, status, and metadata, but no data associated with the SQL. The maximum value is 15 .
   */
  global Integer adaptiveTimeout;

  /**
   * Settings to allow the adjustment of query execution, such as date and time. For example, lc_time , date_style , and external_client_context .
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

}