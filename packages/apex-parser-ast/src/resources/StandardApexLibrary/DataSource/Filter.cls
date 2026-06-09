/**
 * Represents a WHERE clause in a SOSL or SOQL query.
 */
global class Filter {

  global Filter() {}

  global String columnName;

  global Object columnValue;

  global List<DataSource.Filter> subfilters;

  global String tableName;

  global DataSource.FilterType type;

  global Object clone() {}

}