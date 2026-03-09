/**
 * Contains methods for describing summary fields such as Record Count, Sum, Average, Max, Min, and custom summary formulas. Includes name, label, data type, and grouping context.
 */
global class AggregateColumn {

  /**
   * Returns the unique API name of the summary field.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the localized display name for the summarized or custom summary formula field.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the data type of the summarized or custom summary formula field.
   * @return Reports.ColumnDataType
   */
  public Reports.ColumnDataType getDataType() {}

  /**
   * Returns the column grouping in the report where the summary field is displayed.
   * @return String
   */
  public String getAcrossGroupingContext() {}

  /**
   * Returns the row grouping in the report where the summary field is displayed.
   * @return String
   */
  public String getDownGroupingContext() {}

}