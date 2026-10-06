/**
 * Contains the fact map for the report, which represents the report’s data values, and includes summarized fields.
 * Usage
 * The ReportFactWithSummaries class extends the ReportFact class. A ReportFactWithSummaries object is returned if includeDetails is set to false when the report is run.
 */
global class ReportFactWithSummaries extends reports.ReportFact {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns summary-level data for a report, including the record count.
     */
    global List getAggregates() { return null; }

    /**
     * Returns the unique identifier for a row or column grouping. This identifier can be used to index specific data values within each grouping.
     */
    global String getKey() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns a string.
     */
    global override virtual String toString() { return null; }
}