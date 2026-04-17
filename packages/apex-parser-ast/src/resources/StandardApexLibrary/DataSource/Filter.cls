/**
 * Represents a WHERE clause in a SOSL or SOQL query.
 */
global class Filter {

  global String columnName;

  global List subfilters;

  global String tableName;

  global DataSource.FilterType type;

}