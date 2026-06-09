/**
 * Contains methods for describing fields that are used for grouping.
 */
global class GroupingInfo {

  global GroupingInfo() {}

  /**
   * Returns the unique API name of the field or bucket field that is used for row or column grouping.
   * @return String
   */
  global String getName() {}

  /**
   * Returns the order that is used to sort data in a row or column grouping ( ASCENDING or DESCENDING ).
   * @return Reports.ColumnSortOrder
   */
  global Reports.ColumnSortOrder getSortOrder() {}

  /**
   * Returns the date interval that is used for row or column grouping.
   * @return Reports.DateGranularity
   */
  global Reports.DateGranularity getDateGranularity() {}

  /**
   * Returns the summary field that is used to sort data within a grouping in a summary report. The value is null when data within a grouping is not sorted by a summary field.
   * @return String
   */
  global String getSortAggregate() {}

  global Object clone() {}

  global void setDateGranularity(String value) {}

  global void setName(String name) {}

  global void setSortAggregate(String sortAggregate) {}

  global void setSortOrder(String value) {}

}