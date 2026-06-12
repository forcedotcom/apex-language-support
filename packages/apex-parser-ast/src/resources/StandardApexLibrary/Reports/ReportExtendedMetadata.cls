/**
 * Contains report extended metadata for a tabular, summary, or matrix report.
 */
global class ReportExtendedMetadata {

  global ReportExtendedMetadata() {}

  /**
   * Returns all report summaries such as Record Count , Sum , Average , Max , Min , and custom summary formulas. Contains values for each summary that is listed in the report metadata.
   * @return Map<String,Reports.AggregateColumn>
   */
  global Map<String,Reports.AggregateColumn> getAggregateColumnInfo() {}

  /**
   * Returns a map of two properties for each field that has detailed data identified by its unique API name. The detailed data fields are also listed in the report metadata.
   * @return Map<String,Reports.DetailColumn>
   */
  global Map<String,Reports.DetailColumn> getDetailColumnInfo() {}

  /**
   * Returns a map of each row or column grouping to its metadata. Contains values for each grouping that is identified in the groupingsDown and groupingsAcross lists.
   * @return Map<String,Reports.GroupingColumn>
   */
  global Map<String,Reports.GroupingColumn> getGroupingColumnInfo() {}

  global Object clone() {}

}