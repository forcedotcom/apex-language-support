/**
 * Contains the results of running a report.
 */
global class ReportResults {

  /**
   * Returns all report data.
   * @return Boolean
   */
  public Boolean getAllData() {}

  /**
   * Returns summary-level data or summary and detailed data for each row or column grouping. Detailed data is available if the includeDetails parameter is set to true when the report is run.
   * @return MAP<String,Reports.ReportFact>
   */
  public MAP<String,Reports.ReportFact> getFactMap() {}

  /**
   * Returns a collection of column groupings, keys, and values.
   * @return Reports.Dimension
   */
  public Reports.Dimension getGroupingsAcross() {}

  /**
   * Returns a collection of row groupings, keys, and values.
   * @return Reports.Dimension
   */
  public Reports.Dimension getGroupingsDown() {}

  /**
   * Returns information about whether the fact map has detail rows.
   * @return Boolean
   */
  public Boolean getHasDetailRows() {}

  /**
   * Returns additional, detailed metadata about the report, including data type and label information for groupings and summaries.
   * @return Reports.ReportExtendedMetadata
   */
  public Reports.ReportExtendedMetadata getReportExtendedMetadata() {}

  /**
   * Returns metadata about the report, including grouping and summary information.
   * @return Reports.ReportMetadata
   */
  public Reports.ReportMetadata getReportMetadata() {}

}