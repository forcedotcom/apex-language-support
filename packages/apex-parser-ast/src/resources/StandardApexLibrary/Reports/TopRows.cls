/**
 * Contains methods and constructors for working with information about a row limit filter.
 */
global class TopRows {

  /**
   * Returns the sort order of the report rows.
   * @return Reports.ColumnSortOrder
   */
  public Reports.ColumnSortOrder getDirection() {}

  /**
   * Returns the maximum number of rows shown in the report.
   * @return Integer
   */
  public Integer getRowLimit() {}

  /**
   * Sets the sort order of the report’s rows.
   * @param value For possible values, see Reports.ColumnSortOrder .
   */
  public void setDirection(String value) {}

  /**
   * Sets the sort order of the report’s rows.
   * @param direction 
   */
  public void setDirection(Reports.ColumnSortOrder direction) {}

  /**
   * Sets the maximum number of rows included in the report.
   * @param rowLimit 
   */
  public void setRowLimit(Integer rowLimit) {}

  /**
   * Returns a string.
   * @return String
   */
  public String toString() {}

}