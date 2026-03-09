/**
 * Contains report extended metadata for a tabular, summary, or matrix report.
 */
global class ReportExtendedMetadata {

  /**
   * Returns all report summaries such as Record Count , Sum , Average , Max , Min , and custom summary formulas. Contains values for each summary that is listed in the report metadata.
   * @return MAP<String,Reports.AggregateColumn>
   */
  public MAP<String,Reports.AggregateColumn> getAggregateColumnInfo() {}

  /**
   * Returns a map of two properties for each field that has detailed data identified by its unique API name. The detailed data fields are also listed in the report metadata.
   * @return MAP<String,Reports.DetailColumn>
   */
  public MAP<String,Reports.DetailColumn> getDetailColumnInfo() {}

  /**
   * Returns a map of each row or column grouping to its metadata. Contains values for each grouping that is identified in the groupingsDown and groupingsAcross lists.
   * @return MAP<String,Reports.GroupingColumn>
   */
  public MAP<String,Reports.GroupingColumn> getGroupingColumnInfo() {}

}