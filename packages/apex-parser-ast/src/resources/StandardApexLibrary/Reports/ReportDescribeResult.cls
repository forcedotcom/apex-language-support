/**
 * Contains report, report type, and extended metadata for a tabular, summary, or matrix report.
 */
global class ReportDescribeResult {

  global ReportDescribeResult() {}

  /**
   * Returns additional information about grouping and summaries.
   * @return Reports.ReportExtendedMetadata
   */
  global Reports.ReportExtendedMetadata getReportExtendedMetadata() {}

  /**
   * Returns unique identifiers for groupings and summaries.
   * @return Reports.ReportMetadata
   */
  global Reports.ReportMetadata getReportMetadata() {}

  /**
   * Returns the fields in each section of a report type, plus filtering information for those fields.
   * @return Reports.ReportTypeMetadata
   */
  global Reports.ReportTypeMetadata getReportTypeMetadata() {}

  global Object clone() {}

}