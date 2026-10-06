/**
 * Runs a report synchronously or asynchronously and with or without details.
 * Usage
 * Gets instances of reports and describes the metadata of Reports.
 */
global class ReportManager {
    global ReportManager() { }

    /**
     * Retrieves report, report type, and extended metadata for a tabular, summary, or matrix report.
     */
    global static reports.ReportDescribeResult describeReport(Id reportId) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Lists the field data types that you can use to filter the report.
     */
    global static Map getDatatypeFilterOperatorMap() { return null; }

    /**
     * Retrieves results for an instance of a report that has been run asynchronously. The settings you use when you run your asynchronous report determine whether you can retrieve summary data or detailed data.
     */
    global static reports.ReportInstance getReportInstance(Id instanceId) { return null; }

    /**
     * Returns a list of instances for a report that was run asynchronously. Each item in the list represents a separate instance of the report, with metadata for the time at which the report was run.
     */
    global static List getReportInstances(Id reportId) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Runs a report asynchronously with the report ID.
     */
    global static reports.ReportInstance runAsyncReport(Id reportId) { return null; }

    /**
     * Runs a report asynchronously with the report ID. Includes details if includeDetails is set to true.
     */
    global static reports.ReportInstance runAsyncReport(Id reportId, Boolean includeDetails) { return null; }

    /**
     * Runs a report asynchronously with the report ID. Filters the results based on the report metadata in reportMetadata.
     */
    global static reports.ReportInstance runAsyncReport(Id reportId, reports.ReportMetadata rmData) { return null; }

    /**
     * Runs a report asynchronously with the report ID. Includes details if includeDetails is set to true. Filters the report based on the report metadata in reportMetadata.
     */
    global static reports.ReportInstance runAsyncReport(Id reportId, reports.ReportMetadata rmData, Boolean includeDetails) { return null; }

    /**
     * Runs a report immediately with the report ID.
     */
    global static reports.ReportResults runReport(Id reportId) { return null; }

    /**
     * Runs a report immediately with the report ID. Includes details if includeDetails is set to true.
     */
    global static reports.ReportResults runReport(Id reportId, Boolean includeDetails) { return null; }

    /**
     * Runs a report immediately with the report ID. Filters the results based on the report metadata in rmData.
     */
    global static reports.ReportResults runReport(Id reportId, reports.ReportMetadata rmData) { return null; }

    /**
     * Runs a report immediately with the report ID. Includes details if includeDetails is set to true. Filters the results based on the report metadata in reportMetadata.
     */
    global static reports.ReportResults runReport(Id reportId, reports.ReportMetadata rmData, Boolean includeDetails) { return null; }

    global override virtual String toString() { return null; }
}