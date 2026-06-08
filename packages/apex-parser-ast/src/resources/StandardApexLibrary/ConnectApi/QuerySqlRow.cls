/**
 * Represents data associated with the an SQL query output.
 */
global class QuerySqlRow {

  global QuerySqlRow() {}

  /**
   * List of column values.
   */
  global List < Object > row;

  global Object clone() {}

}