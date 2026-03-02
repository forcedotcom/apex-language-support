/**
 * Contains report type metadata, which gives you information about the fields that are available in each section of the report type, plus filter information for those fields.
 */
public class ReportTypeMetadata {

  /**
   * Returns the default division and a list of all possible divisions that can be applied to this type of report.
   * @return Reports.ReportDivisionInfo
   */
  public Reports.ReportDivisionInfo getDivisionInfo() {}

  /**
   * Returns information about the scopes that can be applied to this type of report.
   * @return Reports.ReportScopeInfo
   */
  public Reports.ReportScopeInfo getScopeInfo() {}

  /**
   * Returns information about the standard date filter groupings that can be applied to this type of report. Standard date filter groupings include Calendar Year, Calendar Quarter, Calendar Month, Calendar Week, Fiscal Year, Fiscal Quarter, Day and a custom value based on a user-defined date range.
   * @return List<Reports.StandardDateFilterDurationGroup>
   */
  public List<Reports.StandardDateFilterDurationGroup> getStandardDateFilterDurationGroups() {}

  /**
   * Returns information about standard date filters that can be applied to this type of report.
   * @return Map< String ,Reports.StandardFilterInfo>
   */
  public Map< String ,Reports.StandardFilterInfo> getStandardFilterInfos() {}

}