/**
 * Contains methods for describing summary fields such as Record Count, Sum, Average, Max, Min, and custom summary formulas. Includes name, label, data type, and grouping context.
 */
global class AggregateColumn {

  global AggregateColumn() {}

  /**
   * Returns the unique API name of the summary field.
   * @return String
   */
  global String getName() {}

  /**
   * Returns the localized display name for the summarized or custom summary formula field.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the data type of the summarized or custom summary formula field.
   * @return Reports.ColumnDataType
   */
  global Reports.ColumnDataType getDataType() {}

  /**
   * Returns the column grouping in the report where the summary field is displayed.
   * @return String
   */
  global String getAcrossGroupingContext() {}

  /**
   * Returns the row grouping in the report where the summary field is displayed.
   * @return String
   */
  global String getDownGroupingContext() {}

  global Object clone() {}

}