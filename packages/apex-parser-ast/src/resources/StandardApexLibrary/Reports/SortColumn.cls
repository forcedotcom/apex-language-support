/**
 * Contains information about the sort column used in the report.
 */
global class SortColumn {

  /**
   * Returns the column used to sort the records in the report.
   * @return String
   */
  public String getSortColumn() {}

  /**
   * Returns the the sort order— ascending or descending—for the sort column.
   * @return Reports.ColumnSortOrder
   */
  public Reports.ColumnSortOrder getSortOrder() {}

  /**
   * Sets the column used to sort the records in the report.
   * @param sortColumn 
   */
  public void setSortColumn(String sortColumn) {}

  /**
   * Sets the sort order— ascending or descending—for the sort column.
   * @param sortOrder 
   */
  public void setSortOrder(Reports.ColumnSortOrder sortOrder) {}

}