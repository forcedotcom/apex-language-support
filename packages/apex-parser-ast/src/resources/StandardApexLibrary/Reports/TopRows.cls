/**
 * Contains methods and constructors for working with information about a row limit filter.
 */
global class TopRows {

  global TopRows(Integer rowLimit, Reports.ColumnSortOrder direction) {}

  /**
   * Returns the sort order of the report rows.
   * @return Reports.ColumnSortOrder
   */
  global Reports.ColumnSortOrder getDirection() {}

  /**
   * Returns the maximum number of rows shown in the report.
   * @return Integer
   */
  global Integer getRowLimit() {}

  /**
   * Sets the sort order of the report’s rows.
   * @param value For possible values, see Reports.ColumnSortOrder .
   */
  global void setDirection(String value) {}

  /**
   * Sets the sort order of the report’s rows.
   * @param direction 
   */
  global void setDirection(Reports.ColumnSortOrder direction) {}

  /**
   * Sets the maximum number of rows included in the report.
   * @param rowLimit 
   */
  global void setRowLimit(Integer rowLimit) {}

  /**
   * Returns a string.
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}