/**
 * Contains information about the sort column used in the report.
 */
global class SortColumn {
    global SortColumn() { }

    global SortColumn(String sortColumn, reports.ColumnSortOrder sortOrder) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the column used to sort the records in the report.
     */
    global String getSortColumn() { return null; }

    /**
     * Returns the the sort order— ascending or descending—for the sort column.
     */
    global reports.ColumnSortOrder getSortOrder() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the column used to sort the records in the report.
     */
    global void setSortColumn(String sortColumn) { }

    /**
     * Sets the sort order— ascending or descending—for the sort column.
     */
    global void setSortOrder(reports.ColumnSortOrder sortOrder) { }

    global void setSortOrder(String value) { }

    global override virtual String toString() { return null; }
}