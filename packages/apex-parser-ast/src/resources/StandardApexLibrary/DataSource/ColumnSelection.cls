/**
 * Identifies the list of columns to return during a query or search.
 */
global class ColumnSelection {

  global ColumnSelection() {}

  global DataSource.QueryAggregation aggregation;

  global String columnName;

  global String tableName;

  global Object clone() {}

}