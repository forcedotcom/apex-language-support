/**
 * Represents the SQL query output.
 */
global class QuerySqlOutput {

  /**
   * Data associated with the SQL.
   */
  global ConnectApi.QuerySqlRowRepresentation dataRows;

  /**
   * Metadata associated with the SQL.
   */
  global ConnectApi.QuerySqlMetadataItem metadata;

  /**
   * Number of rows returned by the query.
   */
  global Long returnedRows;

  /**
   * Metadata related to the status of an SQL query.
   */
  global ConnectApi.QuerySqlStatus status;

}