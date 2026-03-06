/**
 * Contains details about how to sort the rows in the result set. Equivalent to an ORDER BY statement in a SOQL query.
 */
global class Order {

  /**
   * Creates an instance of the DataSource.Order class.
   * @param tableName Name of the table whose column values are used to sort the rows in the result set.
   * @param columnName Name of the column whose values are used to sort the rows in the result set.
   * @param direction Direction for sorting rows based on column values.
   * @return DataSource.Order
   */
  public static DataSource.Order get(String tableName, String columnName, DataSource.OrderDirection direction) {}

}