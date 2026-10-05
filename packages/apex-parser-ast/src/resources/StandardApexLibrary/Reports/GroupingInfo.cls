/**
 * Contains methods for describing fields that are used for grouping.
 */
global class GroupingInfo {
    global GroupingInfo() { }

    global GroupingInfo(String name, reports.ColumnSortOrder sortOrder, reports.DateGranularity dateGranularity, String sortAggregate) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the date interval that is used for row or column grouping.
     */
    global reports.DateGranularity getDateGranularity() { return null; }

    /**
     * Returns the unique API name of the field or bucket field that is used for row or column grouping.
     */
    global String getName() { return null; }

    /**
     * Returns the summary field that is used to sort data within a grouping in a summary report. The value is null when data within a grouping is not sorted by a summary field.
     */
    global String getSortAggregate() { return null; }

    /**
     * Returns the order that is used to sort data in a row or column grouping (ASCENDING or DESCENDING).
     */
    global reports.ColumnSortOrder getSortOrder() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setDateGranularity(reports.DateGranularity dateGranularity) { }

    global void setDateGranularity(String value) { }

    global void setName(String name) { }

    global void setSortAggregate(String sortAggregate) { }

    global void setSortOrder(reports.ColumnSortOrder sortOrder) { }

    global void setSortOrder(String value) { }

    global override virtual String toString() { return null; }
}