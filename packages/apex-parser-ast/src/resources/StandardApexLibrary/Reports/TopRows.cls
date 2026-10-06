/**
 * Contains methods and constructors for working with information about a row limit filter.
 */
global class TopRows {
    /**
     * Creates an instance of the Reports.TopRows class. You can then set values by using the class’s set methods.
     */
    global TopRows() { }

    /**
     * Creates an instance of the Reports.TopRows class using the specified parameters.
     */
    global TopRows(Integer rowLimit, reports.ColumnSortOrder direction) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the sort order of the report rows.
     */
    global reports.ColumnSortOrder getDirection() { return null; }

    /**
     * Returns the maximum number of rows shown in the report.
     */
    global Integer getRowLimit() { return 0; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the sort order of the report’s rows.
     */
    global void setDirection(reports.ColumnSortOrder direction) { }

    /**
     * Sets the sort order of the report’s rows.
     */
    global void setDirection(String value) { }

    /**
     * Sets the maximum number of rows included in the report.
     */
    global void setRowLimit(Integer rowLimit) { }

    /**
     * Returns a string.
     */
    global override virtual String toString() { return null; }
}