/**
 * Runs a report synchronously or asynchronously and with or without details.
 */
global class ReportManager {

  /**
   * Retrieves report, report type, and extended metadata for a tabular, summary, or matrix report.
   * @param reportId 
   * @return Reports.ReportDescribeResult
   */
  public static Reports.ReportDescribeResult describeReport(Id reportId) {}

  /**
   * Lists the field data types that you can use to filter the report.
   * @return MAP<String,LIST<Reports.FilterOperator>>
   */
  public static MAP<String,LIST<Reports.FilterOperator>> getDatatypeFilterOperatorMap() {}

  /**
   * Retrieves results for an instance of a report that has been run asynchronously. The settings you use when you run your asynchronous report determine whether you can retrieve summary data or detailed data.
   * @param instanceId 
   * @return Reports.ReportInstance
   */
  public static Reports.ReportInstance getReportInstance(Id instanceId) {}

  /**
   * Returns a list of instances for a report that was run asynchronously. Each item in the list represents a separate instance of the report, with metadata for the time at which the report was run.
   * @param reportId 
   * @return LIST<Reports.ReportInstance>
   */
  public static LIST<Reports.ReportInstance> getReportInstances(Id reportId) {}

  /**
   * Runs a report asynchronously with the report ID. Includes details if includeDetails is set to true . Filters the report based on the report metadata in reportMetadata .
   * @param reportId 
   * @param reportMetadata 
   * @param includeDetails 
   * @return Reports.ReportInstance
   */
  public static Reports.ReportInstance runAsyncReport(Id reportId, Reports.ReportMetadata reportMetadata, Boolean includeDetails) {}

  /**
   * Runs a report asynchronously with the report ID. Includes details if includeDetails is set to true . Filters the report based on the report metadata in reportMetadata .
   * @param reportId 
   * @param includeDetails 
   * @return Reports.ReportInstance
   */
  public static Reports.ReportInstance runAsyncReport(Id reportId, Boolean includeDetails) {}

  /**
   * Runs a report asynchronously with the report ID. Includes details if includeDetails is set to true . Filters the report based on the report metadata in reportMetadata .
   * @param reportId 
   * @param reportMetadata 
   * @return Reports.ReportInstance
   */
  public static Reports.ReportInstance runAsyncReport(Id reportId, Reports.ReportMetadata reportMetadata) {}

  /**
   * Runs a report asynchronously with the report ID. Includes details if includeDetails is set to true . Filters the report based on the report metadata in reportMetadata .
   * @param reportId 
   * @return Reports.ReportInstance
   */
  public static Reports.ReportInstance runAsyncReport(Id reportId) {}

  /**
   * Runs a report immediately with the report ID. Includes details if includeDetails is set to true . Filters the results based on the report metadata in reportMetadata .
   * @param reportId 
   * @param reportMetadata 
   * @param includeDetails 
   * @return Reports.ReportResults
   */
  public static Reports.ReportResults runReport(Id reportId, Reports.ReportMetadata reportMetadata, Boolean includeDetails) {}

  /**
   * Runs a report immediately with the report ID. Includes details if includeDetails is set to true . Filters the results based on the report metadata in reportMetadata .
   * @param reportId 
   * @param includeDetails 
   * @return Reports.ReportResults
   */
  public static Reports.ReportResults runReport(Id reportId, Boolean includeDetails) {}

  /**
   * Runs a report immediately with the report ID. Includes details if includeDetails is set to true . Filters the results based on the report metadata in reportMetadata .
   * @param reportId 
   * @param reportMetadata 
   * @return Reports.ReportResults
   */
  public static Reports.ReportResults runReport(Id reportId, Reports.ReportMetadata reportMetadata) {}

  /**
   * Runs a report immediately with the report ID. Includes details if includeDetails is set to true . Filters the results based on the report metadata in reportMetadata .
   * @param reportId 
   * @return Reports.ReportResults
   */
  public static Reports.ReportResults runReport(Id reportId) {}

}