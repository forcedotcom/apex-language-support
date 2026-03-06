/**
 * Contains information about the divisions that can be used to filter a report.
 */
global class ReportDivisionInfo {

  /**
   * Returns the default division for the report.
   * @return String
   */
  public String getDefaultValue() {}

  /**
   * Returns a list of all possible divisions for the report.
   * @return List<Reports.FilterValue>
   */
  public List<Reports.FilterValue> getValues() {}

}