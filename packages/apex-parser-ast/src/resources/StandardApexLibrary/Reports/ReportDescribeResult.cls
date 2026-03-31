/**
 * Contains report, report type, and extended metadata for a tabular, summary, or matrix report.
 */
global class ReportDescribeResult {

  /**
   * Returns additional information about grouping and summaries.
   * @return Reports.ReportExtendedMetadata
   */
  public Reports.ReportExtendedMetadata getReportExtendedMetadata() {}

  /**
   * Returns unique identifiers for groupings and summaries.
   * @return Reports.ReportMetadata
   */
  public Reports.ReportMetadata getReportMetadata() {}

  /**
   * Returns the fields in each section of a report type, plus filtering information for those fields.
   * @return Reports.ReportTypeMetadata
   */
  public Reports.ReportTypeMetadata getReportTypeMetadata() {}

}