/**
 * Contains information about the divisions that can be used to filter a report.
 */
global class ReportDivisionInfo {

  global ReportDivisionInfo() {}

  /**
   * Returns the default division for the report.
   * @return String
   */
  global String getDefaultValue() {}

  /**
   * Returns a list of all possible divisions for the report.
   * @return List<Reports.FilterValue>
   */
  global List<Reports.FilterValue> getValues() {}

  global Object clone() {}

}