/**
 * Represents the rows output for an SQL query.
 */
global class QuerySqlPageOutput {

  global QuerySqlPageOutput() {}

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

  global Object clone() {}

}