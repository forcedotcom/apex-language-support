/**
 * Contains the fact map for the report, which represents the report’s data values.
 */
global class ReportFact {

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

}