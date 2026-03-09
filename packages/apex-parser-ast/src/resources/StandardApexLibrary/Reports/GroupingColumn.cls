/**
 * Contains methods for describing fields that are used for column grouping.
 */
global class GroupingColumn {

  /**
   * Returns the unique API name of the field or bucket field that is used for column grouping.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the localized display name of the field that is used for column grouping.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the data type of the field that is used for column grouping.
   * @return Reports.ColumnDataType
   */
  public Reports.ColumnDataType getDataType() {}

  /**
   * Returns the level of grouping for the column.
   * @return Integer
   */
  public Integer getGroupingLevel() {}

}