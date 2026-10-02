/**
 * Contains the results of running a report.
 */
global class ReportResults {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns all report data.
     * <p>Usage
     * When true, indicates that all report results are returned.
     * When false, indicates that results are returned for the same number of rows as in a report run in Salesforce.
     * Note
     * For reports that contain too many records, use filters to refine results.
     */
    global Boolean getAllData() { return false; }

    /**
     * Returns summary-level data or summary and detailed data for each row or column grouping. Detailed data is available if the includeDetails parameter is set to true when the report is run.
     */
    global Map getFactMap() { return null; }

    /**
     * Returns a collection of column groupings, keys, and values.
     */
    global reports.Dimension getGroupingsAcross() { return null; }

    /**
     * Returns a collection of row groupings, keys, and values.
     */
    global reports.Dimension getGroupingsDown() { return null; }

    /**
     * Returns information about whether the fact map has detail rows.
     * <p>Usage
     * When true, indicates that the fact map returns values for summary-level and record-level data.
     * When false, indicates that the fact map returns summary values.
     */
    global Boolean getHasDetailRows() { return false; }

    /**
     * Returns additional, detailed metadata about the report, including data type and label information for groupings and summaries.
     */
    global reports.ReportExtendedMetadata getReportExtendedMetadata() { return null; }

    /**
     * Returns metadata about the report, including grouping and summary information.
     */
    global reports.ReportMetadata getReportMetadata() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}