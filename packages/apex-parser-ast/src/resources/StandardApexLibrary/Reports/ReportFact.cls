/**
 * Contains the fact map for the report, which represents the report’s data values.
 * Usage
 * ReportFact is the parent class of ReportFactWithDetails and ReportFactWithSummaries. If includeDetails is true when the report is run, the fact map is a ReportFactWithDetails object. If includeDetails is false when the report is run, the fact map is a ReportFactWithSummaries object.
 */
global virtual class ReportFact {
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

    global override virtual String toString() { return null; }
}