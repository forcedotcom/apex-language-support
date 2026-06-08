/**
 * Represents a WHERE clause in a SOSL or SOQL query.
 */
global class Filter {

  global Filter() {}

  public String columnName;

  public Object columnValue;

  public List<DataSource.Filter> subfilters;

  public String tableName;

  public DataSource.FilterType type;

  global Object clone() {}

}