/**
 * Contains a breakdown of the SOQL or SOSL query. Its properties represent the FROM, ORDER BY, SELECT, and WHERE clauses in the query.
 */
global class TableSelection {

  global TableSelection() {}

  global List<DataSource.ColumnSelection> columnsSelected;

  global DataSource.Filter filter;

  global List<DataSource.Order> order;

  global String tableSelected;

  global Object clone() {}

}