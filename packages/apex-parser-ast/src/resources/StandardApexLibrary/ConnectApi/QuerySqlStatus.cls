/**
 * Represents the status of an SQL query.
 */
global class QuerySqlStatus {

  /**
   * Number of chunks available for extraction.
   */
  global Long chunkCount;

  /**
   * Completion status of the query. Finished ResultsProduced Running Unspecified
   */
  global QuerySqlStatusEnum completionStatus;

  /**
   * Time when the query expires. You can't make requests to an expired query.
   */
  global String expirationTime;

  /**
   * A number between 0 and 1 that indicates the current progress of query. 0 : The query execution has not started. 1 : The query execution is complete and the results are available for you to retrieve.
   */
  global Double progress;

  /**
   * ID of the query for which status information is returned.
   */
  global String queryId;

  /**
   * Number of rows available for extraction.
   */
  global Long rowCount;

}