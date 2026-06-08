/**
 * Contains a breakdown of the SOQL or SOSL query. Its properties represent the FROM, ORDER BY, SELECT, and WHERE clauses in the query.
 */
global class TableSelection {

  global TableSelection() {}

  public List<DataSource.ColumnSelection> columnsSelected;

  public DataSource.Filter filter;

  public List<DataSource.Order> order;

  public String tableSelected;

  global Object clone() {}

}