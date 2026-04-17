/**
 * Contains methods for describing fields that are used for grouping.
 */
global class GroupingInfo {

  /**
   * Returns the unique API name of the field or bucket field that is used for row or column grouping.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the order that is used to sort data in a row or column grouping ( ASCENDING or DESCENDING ).
   * @return Reports.ColumnSortOrder
   */
  public Reports.ColumnSortOrder getSortOrder() {}

  /**
   * Returns the date interval that is used for row or column grouping.
   * @return Reports.DateGranularity
   */
  public Reports.DateGranularity getDateGranularity() {}

  /**
   * Returns the summary field that is used to sort data within a grouping in a summary report. The value is null when data within a grouping is not sorted by a summary field.
   * @return String
   */
  public String getSortAggregate() {}

}