/**
 * Contains report metadata for a tabular, summary, or matrix report.
 * Usage
 * Report metadata gives information about the report as a whole, such as the report type, format, summary fields, row or column groupings, and filters that are saved to the report. You can use the ReportMetadata class to retrieve report metadata and to set metadata that can be used to filter a report.
 */
global class ReportMetadata {
    global ReportMetadata() { }

    global ReportMetadata(String name, String developerName, Id id, List groupingsAcross, List groupingsDown, List aggregates, List buckets, List detailColumns, String reportBooleanFilter, List reportFilters, List historicalSnapshotDates, reports.ReportFormat reportFormat, reports.ReportType reportType, String currencyCode, String scope, String division, List sortBy, reports.StandardDateFilter standardDateFilter, Boolean hasDetailRows, Boolean hasRecordCount, List standardFilters, String description, Boolean showSubtotals, Boolean showGrandTotal, reports.TopRows topRows, Map customSummaryFormula, List crossFilters) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns unique identifiers for summary or custom summary formula fields in the report.
     * Usage
     * For example:
     * a!Amount represents the average for the Amount column.
     * s!Amount represents the sum of the Amount column.
     * m!Amount represents the minimum value of the Amount column.
     * x!Amount represents the maximum value of the Amount column.
     * s!<customfieldID> represents the sum of a custom field column. For custom fields and custom report types, the identifier is a combination of the summary type and the field ID.
     */
    global List getAggregates() { return null; }

    /**
     * Returns a list of bucket fields in the report.
     */
    global List getBuckets() { return null; }

    global List getCrossFilters() { return null; }

    /**
     * Returns report currency, such as USD, EUR, or GBP, for an organization that has multicurrency enabled. The value is null if the organization does not have multicurrency enabled.
     */
    global String getCurrencyCode() { return null; }

    /**
     * Returns information about custom summary formulas in a report.
     */
    global Map getCustomSummaryFormula() { return null; }

    /**
     * Returns the description of the report.
     */
    global String getDescription() { return null; }

    /**
     * Returns unique API names (column names) for the fields that contain detailed data. For example, the method might return the following values: “OPPORTUNITY_NAME, TYPE, LEAD_SOURCE, AMOUNT.”
     */
    global List getDetailColumns() { return null; }

    /**
     * Returns the report API name. For example, the method might return the following value: “Closed_Sales_This_Quarter.”
     */
    global String getDeveloperName() { return null; }

    /**
     * Returns the division specified in the report.
     * Note
     * Reports that use standard filters (such as My Cases or My Team’s Accounts) show records in all divisions. These reports can’t be further limited to a specific division.
     */
    global String getDivision() { return null; }

    /**
     * Returns column groupings in a report.
     * Usage
     * The identifier is:
     * An empty array for reports in summary format, because summary reports don't include column groupings
     * BucketField_(ID) for bucket fields
     * The ID of a custom field when the custom field is used for a column grouping
     */
    global List getGroupingsAcross() { return null; }

    /**
     * Returns row groupings for a report.
     * Usage
     * The identifier is:
     * BucketField_(ID) for bucket fields
     * The ID of a custom field when the custom field is used for grouping
     */
    global List getGroupingsDown() { return null; }

    /**
     * Indicates whether the report has detail rows.
     */
    global Boolean getHasDetailRows() { return false; }

    /**
     * Indicates whether the report shows the total number of records.
     */
    global Boolean getHasRecordCount() { return false; }

    /**
     * Returns a list of historical snapshot dates.
     */
    global List getHistoricalSnapshotDates() { return null; }

    /**
     * Returns the unique report ID.
     */
    global Id getId() { return null; }

    /**
     * Returns the report name.
     */
    global String getName() { return null; }

    /**
     * Returns logic to parse custom field filters. The value is null when filter logic is not specified.
     */
    global String getReportBooleanFilter() { return null; }

    /**
     * Returns a list of each custom filter in the report along with the field name, filter operator, and filter value.
     */
    global List getReportFilters() { return null; }

    /**
     * Returns the format of the report.
     * Usage
     * This value can be:
     * TABULAR
     * SUMMARY
     * MATRIX
     */
    global reports.ReportFormat getReportFormat() { return null; }

    /**
     * Returns the unique API name and display name for the report type.
     */
    global reports.ReportType getReportType() { return null; }

    /**
     * Returns the API name for the scope defined for the report. Scope values depend on the report type.
     */
    global String getScope() { return null; }

    /**
     * Indicates whether the report shows the grand total.
     */
    global Boolean getShowGrandTotal() { return false; }

    /**
     * Indicates whether the report shows subtotals, such as column or row totals.
     */
    global Boolean getShowSubtotals() { return false; }

    /**
     * Returns the list of columns on which the report is sorted. Currently, you can sort on only one column.
     */
    global List getSortBy() { return null; }

    /**
     * Returns information about the standard date filter for the report, such as the start date, end date, date range, and date field API name.
     */
    global reports.StandardDateFilter getStandardDateFilter() { return null; }

    /**
     * Returns a list of standard filters for the report.
     */
    global List getStandardFilters() { return null; }

    /**
     * Returns information about a row limit filter, including the number of rows returned and the sort order.
     */
    global reports.TopRows getTopRows() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets unique identifiers for standard or custom summary formula fields in the report.
     */
    global void setAggregates(List aggregates) { }

    /**
     * Creates bucket fields in a report.
     */
    global void setBuckets(List buckets) { }

    /**
     * Applies cross filters to a report.
     */
    global void setCrossFilters(List crossFilters) { }

    /**
     * Sets the currency, such as USD, EUR, or GBP, for report summary fields in an organization that has multicurrency enabled.
     */
    global void setCurrencyCode(String currencyCode) { }

    /**
     * Adds a custom summary formula to a report.
     */
    global void setCustomSummaryFormula(Map customSummaryFormula) { }

    /**
     * Sets the description of the report.
     */
    global void setDescription(String description) { }

    /**
     * Sets the unique API names for the fields that contain detailed data—for example, OPPORTUNITY_NAME, TYPE, LEAD_SOURCE, or AMOUNT.
     */
    global void setDetailColumns(List detailColumns) { }

    /**
     * Sets the report API name—for example, Closed_Sales_This_Quarter.
     */
    global void setDeveloperName(String developerName) { }

    /**
     * Sets the division of the report.
     * Note
     * Reports that use standard filters (such as My Cases or My Team’s Accounts) show records in all divisions. These reports can’t be further limited to a specific division.
     */
    global void setDivision(String division) { }

    /**
     * Sets column groupings in a report.
     */
    global void setGroupingsAcross(List groupingsAcross) { }

    /**
     * Sets row groupings for a report.
     */
    global void setGroupingsDown(List groupingsDown) { }

    /**
     * Specifies whether the report has detail rows.
     */
    global void setHasDetailRows(Boolean hasDetailRows) { }

    /**
     * Specifies whether the report is configured to show the total number of records.
     */
    global void setHasRecordCount(Boolean hasRecordCount) { }

    /**
     * Sets a list of historical snapshot dates.
     */
    global void setHistoricalSnapshotDates(List historicalSnapshotDates) { }

    /**
     * Sets the unique report ID.
     */
    global void setId(Id id) { }

    /**
     * Sets the report name.
     */
    global void setName(String name) { }

    /**
     * Sets logic to parse custom field filters.
     */
    global void setReportBooleanFilter(String reportBooleanFilter) { }

    /**
     * Sets a list of each custom filter in the report along with the field name, filter operator, and filter value.
     */
    global void setReportFilters(List reportFilters) { }

    /**
     * Sets the format of the report.
     */
    global void setReportFormat(reports.ReportFormat reportFormat) { }

    global void setReportFormat(String value) { }

    /**
     * Sets the unique API name and display name for the report type.
     */
    global void setReportType(reports.ReportType reportType) { }

    /**
     * Sets the API name for the scope defined for the report. Scope values depend on the report type.
     */
    global void setScope(String scope) { }

    /**
     * Specifies whether the report shows the grand total.
     */
    global void setShowGrandTotal(Boolean showGrandTotal) { }

    /**
     * Specifies whether the report shows subtotals, such as column or row totals.
     */
    global void setShowSubtotals(Boolean showSubtotals) { }

    /**
     * Sets the list of columns on which the report is sorted. Currently, you can only sort on one column.
     */
    global void setSortBy(List sortBy) { }

    /**
     * Sets the standard date filter—which includes the start date, end date, date range, and date field API name—for the report.
     */
    global void setStandardDateFilter(reports.StandardDateFilter standardDateFilter) { }

    /**
     * Sets one or more standard filters on the report.
     */
    global void setStandardFilters(List standardFilters) { }

    global void setTopRows(reports.TopRows topRows) { }

    global override virtual String toString() { return null; }
}