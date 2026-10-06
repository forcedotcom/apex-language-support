/**
 * Information about categories of fields in a report type.
 * Usage
 * A report type column category is a set of fields that the report type grants access to. For example, an opportunity report has categories like Opportunity Information and Primary Contact. The Opportunity Information category has fields like Amount, Probability, and Close Date.
 * Get category information about a report by first getting the report metadata:
 * // Get the report ID
 * List <Report> reportList = [SELECT Id,DeveloperName FROM Report where DeveloperName = 'Q1_Opportunities2'];
 *
 * String reportId = (String)reportList.get(0).get('Id');
 *
 * // Describe the report
 * Reports.ReportDescribeResult describeResults = Reports.ReportManager.describeReport(reportId);
 *
 * // Get report type metadata
 * Reports.ReportTypeMetadata reportTypeMetadata = describeResults.getReportTypeMetadata();
 *
 * // Get report type column categories
 * List<Reports.ReportTypeColumnCategory> reportTypeColumnCategories = reportTypeMetadata.getCategories();
 *
 * System.debug('reportTypeColumnCategories: ' + reportTypeColumnCategories);
 */
global class ReportTypeColumnCategory {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns information for all fields in the report type. The information is organized by each section’s unique API name.
     */
    global Map getColumns() { return null; }

    /**
     * Returns the localized display name of a section in the report type under which fields are organized. For example, in an Accounts with Contacts custom report type, Account General is the display name of the section that contains fields on general account information.
     */
    global String getLabel() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}