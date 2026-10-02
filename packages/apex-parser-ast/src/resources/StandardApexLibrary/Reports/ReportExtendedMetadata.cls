/**
 * Contains report extended metadata for a tabular, summary, or matrix report.
 * <p>Report extended metadata provides additional, detailed metadata about summary and grouping fields, including data type and label information.
 */
global class ReportExtendedMetadata {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns all report summaries such as Record Count, Sum, Average, Max, Min, and custom summary formulas. Contains values for each summary that is listed in the report metadata.
     */
    global Map getAggregateColumnInfo() { return null; }

    /**
     * Returns a map of two properties for each field that has detailed data identified by its unique API name. The detailed data fields are also listed in the report metadata.
     */
    global Map getDetailColumnInfo() { return null; }

    /**
     * Returns a map of each row or column grouping to its metadata. Contains values for each grouping that is identified in the groupingsDown and groupingsAcross lists.
     */
    global Map getGroupingColumnInfo() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}