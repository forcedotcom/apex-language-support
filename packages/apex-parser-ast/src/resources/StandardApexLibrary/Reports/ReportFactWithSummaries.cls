/**
 * Contains the fact map for the report, which represents the report’s data values, and includes summarized fields.
 */
global class ReportFactWithSummaries {

  global ReportFactWithSummaries() {}

  /**
   * Returns summary-level data for a report, including the record count.
   * @return LIST<Reports.SummaryValue>
   */
  global LIST<Reports.SummaryValue> getAggregates() {}

  /**
   * Returns the unique identifier for a row or column grouping. This identifier can be used to index specific data values within each grouping.
   * @return String
   */
  global String getKey() {}

  /**
   * Returns a string.
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}