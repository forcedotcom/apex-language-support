/**
 * Contains information about a report filter, including column, operator, and value.
 */
global class ReportFilter {

  global ReportFilter(String column, String operator, String value) {}

  /**
   * Returns the unique API name for the field that’s being filtered.
   * @return String
   */
  global String getColumn() {}

  global String getEntityName() {}

  /**
   * Returns the type of report filter.
   * @return String
   */
  global String getFilterType() {}

  /**
   * Returns the unique API name for the condition that is used to filter a field, such as “greater than” or “not equal to.” Filter conditions depend on the data type of the field.
   * @return String
   */
  global String getOperator() {}

  /**
   * Returns the value that the field is being filtered by. For example, the field Age can be filtered by a numeric value.
   * @return String
   */
  global String getValue() {}

  /**
   * Sets the unique API name for the field that’s being filtered.
   * @param column 
   */
  global void setColumn(String column) {}

  global void setEntityName(String entityName) {}

  /**
   * Sets the type of report filter.
   * @param column 
   */
  global void setFilterType(String column) {}

  /**
   * Sets the unique API name for the condition that is used to filter a field, such as “greater than” or “not equal to.” Filter conditions depend on the data type of the field.
   * @param operator 
   */
  global void setOperator(String operator) {}

  /**
   * Sets the value by which a field can be filtered. For example, the field Age can be filtered by a numeric value.
   * @param value 
   */
  global void setValue(String value) {}

  /**
   * Returns a string representation of the filter.
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}