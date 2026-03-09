/**
 * Contains a breakdown of the SOQL or SOSL query. Its properties represent the FROM, ORDER BY, SELECT, and WHERE clauses in the query.
 */
global class TableSelection {

  global DataSource.Filter filter;

  global String tableSelected;

}