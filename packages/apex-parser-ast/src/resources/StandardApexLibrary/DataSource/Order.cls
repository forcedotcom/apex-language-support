/**
 * Contains details about how to sort the rows in the result set. Equivalent to an ORDER BY statement in a SOQL query.
 */
global class Order {

  global Order() {}

  global String columnName;

  global DataSource.OrderDirection direction;

  global String tableName;

  /**
   * Creates an instance of the DataSource.Order class.
   * @param tableName Name of the table whose column values are used to sort the rows in the result set.
   * @param columnName Name of the column whose values are used to sort the rows in the result set.
   * @param direction Direction for sorting rows based on column values.
   * @return DataSource.Order
   */
  global static DataSource.Order get(String tableName, String columnName, DataSource.OrderDirection direction) {}

  global Object clone() {}

}