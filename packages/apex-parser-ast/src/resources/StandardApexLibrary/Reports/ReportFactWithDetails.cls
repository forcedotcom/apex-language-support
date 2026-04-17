/**
 * Contains the detailed fact map for the report, which represents the report’s data values.
 */
global class ReportFactWithDetails {

  /**
   * Returns summary-level data for a report, including the record count.
   * @return LIST<Reports.SummaryValue>
   */
  public LIST<Reports.SummaryValue> getAggregates() {}

  /**
   * Returns the unique identifier for a row or column grouping. This identifier can be used to index specific data values within each grouping.
   * @return String
   */
  public String getKey() {}

  /**
   * Returns a list of detailed report data in the order of the detail columns that are provided by the report metadata.
   * @return LIST<Reports.ReportDetailRow>
   */
  public LIST<Reports.ReportDetailRow> getRows() {}

}