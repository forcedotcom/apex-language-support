/**
 * Contains the detailed fact map for the report, which represents the report’s data values.
 * <p>Usage
 * The ReportFactWithDetails class extends the ReportFact class. A ReportFactWithDetails object is returned if includeDetails is set to true when the report is run. To access the detail values, you’ll need to cast the return value of the ReportResults.getFactMap method to a ReportFactWithDetails object.
 */
global class ReportFactWithDetails extends reports.ReportFact {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns summary-level data for a report, including the record count.
     */
    global List getAggregates() { return null; }

    /**
     * Returns the unique identifier for a row or column grouping. This identifier can be used to index specific data values within each grouping.
     */
    global String getKey() { return null; }

    /**
     * Returns a list of detailed report data in the order of the detail columns that are provided by the report metadata.
     */
    global List getRows() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}