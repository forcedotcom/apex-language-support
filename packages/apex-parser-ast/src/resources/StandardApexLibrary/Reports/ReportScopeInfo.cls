/**
 * Contains information about possible scope values that you can choose. Scope values depend on the report type. For example, you can set the scope for opportunity reports to All opportunities , My team’s opportunities , or My opportunities .
 */
public class ReportScopeInfo {

  /**
   * Returns the default scope of the data to display in the report.
   * @return String
   */
  public String getDefaultValue() {}

  /**
   * Returns a list of scope values specified for the report.
   * @return List<Reports.ReportScopeValue>
   */
  public List<Reports.ReportScopeValue> getValues() {}

}