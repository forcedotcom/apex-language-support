/**
 * Contains report metadata for a tabular, summary, or matrix report.
 */
public class ReportMetadata {

  /**
   * Returns a list of bucket fields in the report.
   * @return List<Reports.BucketField>
   */
  public List<Reports.BucketField> getBuckets() {}

  /**
   * Returns information about cross filters applied to a report.
   * @return Reports.CrossFilter
   */
  public Reports.CrossFilter getCrossFilters() {}

  /**
   * Returns information about custom summary formulas in a report.
   * @return Map< String ,Reports.ReportCsf>
   */
  public Map< String ,Reports.ReportCsf> getCustomSummaryFormula() {}

  /**
   * Returns the description of the report.
   * @return String
   */
  public String getDescription() {}

  /**
   * Returns the division specified in the report.
   * @return String
   */
  public String getDivision() {}

  /**
   * Indicates whether the report has detail rows.
   * @return Boolean
   */
  public Boolean getHasDetailRows() {}

  /**
   * Indicates whether the report shows the total number of records.
   * @return Boolean
   */
  public Boolean getHasRecordCount() {}

  /**
   * Returns the API name for the scope defined for the report. Scope values depend on the report type.
   * @return String
   */
  public String getScope() {}

  /**
   * Indicates whether the report shows the grand total.
   * @return Boolean
   */
  public Boolean getShowGrandTotal() {}

  /**
   * Indicates whether the report shows subtotals, such as column or row totals.
   * @return Boolean
   */
  public Boolean getShowSubtotals() {}

  /**
   * Returns the list of columns on which the report is sorted. Currently, you can sort on only one column.
   * @return List<Reports.SortColumn>
   */
  public List<Reports.SortColumn> getSortBy() {}

  /**
   * Returns information about the standard date filter for the report, such as the start date, end date, date range, and date field API name.
   * @return Reports.StandardDateFilter
   */
  public Reports.StandardDateFilter getStandardDateFilter() {}

  /**
   * Returns a list of standard filters for the report.
   * @return List<Reports.StandardFilter>
   */
  public List<Reports.StandardFilter> getStandardFilters() {}

  /**
   * Returns information about a row limit filter, including the number of rows returned and the sort order.
   * @return Reports.TopRows
   */
  public Reports.TopRows getTopRows() {}

  /**
   * Sets unique identifiers for standard or custom summary formula fields in the report.
   * @param aggregates 
   */
  public void setAggregates(List< String > aggregates) {}

  /**
   * Creates bucket fields in a report.
   * @param buckets 
   */
  public void setBuckets(List<Reports.BucketField> buckets) {}

  /**
   * Applies cross filters to a report.
   * @param crossFilters 
   */
  public void setCrossFilters(List<Reports.CrossFilter> crossFilters) {}

  /**
   * Sets the currency, such as USD, EUR, or GBP, for report summary fields in an organization that has multicurrency enabled.
   * @param currencyCode 
   */
  public void setCurrencyCode(String currencyCode) {}

  /**
   * Adds a custom summary formula to a report.
   * @param String 
   * @param customSummaryFormula 
   */
  public void setCustomSummaryFormula(MAP< String, Reports.ReportCsf> customSummaryFormula) {}

  /**
   * Sets the description of the report.
   * @param description 
   */
  public void setDescription(String description) {}

  /**
   * Sets the unique API names for the fields that contain detailed data—for example, OPPORTUNITY_NAME , TYPE , LEAD_SOURCE , or AMOUNT .
   * @param detailColumns 
   */
  public void setDetailColumns(List< String > detailColumns) {}

  /**
   * Sets the report API name—for example, Closed_Sales_This_Quarter .
   * @param developerName 
   */
  public void setDeveloperName(String developerName) {}

  /**
   * Sets the division of the report.
   * @param division 
   */
  public void setDivision(String division) {}

  /**
   * Sets column groupings in a report.
   * @param groupingInfo 
   */
  public void setGroupingsAcross(List<Reports.GroupingInfo> groupingInfo) {}

  /**
   * Sets row groupings for a report.
   * @param groupingInfo 
   */
  public void setGroupingsDown(List<Reports.GroupingInfo> groupingInfo) {}

  /**
   * Specifies whether the report has detail rows.
   * @param hasDetailRows 
   */
  public void setHasDetailRows(Boolean hasDetailRows) {}

  /**
   * Specifies whether the report is configured to show the total number of records.
   * @param hasRecordCount 
   */
  public void setHasRecordCount(Boolean hasRecordCount) {}

  /**
   * Sets the unique report ID.
   * @param id 
   */
  public void setId(Id id) {}

  /**
   * Sets the report name.
   * @param name 
   */
  public void setName(String name) {}

  /**
   * Sets the format of the report.
   * @param format 
   */
  public void setReportFormat(Reports.ReportFormat format) {}

  /**
   * Sets the unique API name and display name for the report type.
   * @param reportType 
   */
  public void setReportType(Reports.ReportType reportType) {}

  /**
   * Sets the API name for the scope defined for the report. Scope values depend on the report type.
   * @param scopeName 
   */
  public void setScope(String scopeName) {}

  /**
   * Specifies whether the report shows the grand total.
   * @param showGrandTotal 
   */
  public void setShowGrandTotal(Boolean showGrandTotal) {}

  /**
   * Specifies whether the report shows subtotals, such as column or row totals.
   * @param showSubtotals 
   */
  public void setShowSubtotals(Boolean showSubtotals) {}

  /**
   * Sets the list of columns on which the report is sorted. Currently, you can only sort on one column.
   * @param column 
   */
  public void setSortBy(List<Reports.SortColumn> column) {}

  /**
   * Sets the standard date filter—which includes the start date, end date, date range, and date field API name—for the report.
   * @param dateFilter 
   */
  public void setStandardDateFilter(Reports.StandardDateFilter dateFilter) {}

  /**
   * Sets one or more standard filters on the report.
   * @param filters 
   */
  public void setStandardFilters(List<Reports.StandardFilter> filters) {}

  /**
   * Applies a row limit filter to a report.
   * @param topRows 
   * @return Reports.TopRows
   */
  public Reports.TopRows setTopRows(Reports.TopRows topRows) {}

}