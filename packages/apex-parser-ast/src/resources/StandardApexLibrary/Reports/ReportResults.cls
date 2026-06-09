/**
 * Contains the results of running a report.
 */
global class ReportResults {

  global ReportResults() {}

  /**
   * Returns all report data.
   * @return Boolean
   */
  global Boolean getAllData() {}

  /**
   * Returns summary-level data or summary and detailed data for each row or column grouping. Detailed data is available if the includeDetails parameter is set to true when the report is run.
   * @return Map<String,Reports.ReportFact>
   */
  global Map<String,Reports.ReportFact> getFactMap() {}

  /**
   * Returns a collection of column groupings, keys, and values.
   * @return Reports.Dimension
   */
  global Reports.Dimension getGroupingsAcross() {}

  /**
   * Returns a collection of row groupings, keys, and values.
   * @return Reports.Dimension
   */
  global Reports.Dimension getGroupingsDown() {}

  /**
   * Returns information about whether the fact map has detail rows.
   * @return Boolean
   */
  global Boolean getHasDetailRows() {}

  /**
   * Returns additional, detailed metadata about the report, including data type and label information for groupings and summaries.
   * @return Reports.ReportExtendedMetadata
   */
  global Reports.ReportExtendedMetadata getReportExtendedMetadata() {}

  /**
   * Returns metadata about the report, including grouping and summary information.
   * @return Reports.ReportMetadata
   */
  global Reports.ReportMetadata getReportMetadata() {}

  global Object clone() {}

}