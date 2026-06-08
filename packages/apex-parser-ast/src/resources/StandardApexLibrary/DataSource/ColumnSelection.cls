/**
 * Identifies the list of columns to return during a query or search.
 */
global class ColumnSelection {

  global ColumnSelection() {}

  public DataSource.QueryAggregation aggregation;

  public String columnName;

  public String tableName;

  global Object clone() {}

}