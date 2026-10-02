/**
 * Contains report, report type, and extended metadata for a tabular, summary, or matrix report.
 */
global class ReportDescribeResult {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns additional information about grouping and summaries.
     */
    global reports.ReportExtendedMetadata getReportExtendedMetadata() { return null; }

    /**
     * Returns unique identifiers for groupings and summaries.
     */
    global reports.ReportMetadata getReportMetadata() { return null; }

    /**
     * Returns the fields in each section of a report type, plus filtering information for those fields.
     */
    global reports.ReportTypeMetadata getReportTypeMetadata() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}