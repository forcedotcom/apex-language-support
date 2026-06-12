/**
 * Contains information about a possible scope value. Scope values depend on the report type. For example, you can set the scope for opportunity reports to All opportunities , My team’s opportunities , or My opportunities .
 */
global class ReportScopeValue {

  global ReportScopeValue() {}

  /**
   * Returns a boolean value that indicates whether you can segment the report by this scope.
   * @return Boolean
   */
  global Boolean getAllowsDivision() {}

  /**
   * Returns the display name of the scope of the report.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the scope value for the report.
   * @return String
   */
  global String getValue() {}

  global Object clone() {}

}