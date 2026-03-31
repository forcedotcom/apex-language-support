/**
 * Contains information about a report filter, including column, operator, and value.
 */
global class ReportFilter {

  public ReportFilter(String column, String operator, String value) {}

  /**
   * Returns the unique API name for the field that’s being filtered.
   * @return String
   */
  public String getColumn() {}

  public String getEntityName() {}

  /**
   * Returns the type of report filter.
   * @return String
   */
  public String getFilterType() {}

  /**
   * Returns the unique API name for the condition that is used to filter a field, such as “greater than” or “not equal to.” Filter conditions depend on the data type of the field.
   * @return String
   */
  public String getOperator() {}

  /**
   * Returns the value that the field is being filtered by. For example, the field Age can be filtered by a numeric value.
   * @return String
   */
  public String getValue() {}

  /**
   * Sets the unique API name for the field that’s being filtered.
   * @param column 
   */
  public void setColumn(String column) {}

  public void setEntityName(String entityName) {}

  /**
   * Sets the type of report filter.
   * @param column 
   */
  public void setFilterType(String column) {}

  /**
   * Sets the unique API name for the condition that is used to filter a field, such as “greater than” or “not equal to.” Filter conditions depend on the data type of the field.
   * @param operator 
   */
  public void setOperator(String operator) {}

  /**
   * Sets the value by which a field can be filtered. For example, the field Age can be filtered by a numeric value.
   * @param value 
   */
  public void setValue(String value) {}

  /**
   * Returns a string representation of the filter.
   * @return String
   */
  public String toString() {}

}