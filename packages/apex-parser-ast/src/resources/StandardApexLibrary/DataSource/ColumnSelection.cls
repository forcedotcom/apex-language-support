/**
 * Identifies the list of columns to return during a query or search.
 * <p>Usage
 * This class is associated with the SELECT clause for a SOQL query, or the RETURNING clause for a SOSL query.
 */
global class ColumnSelection {
    /**
     * How to aggregate the column’s data.
     * <p>DataSource.QueryAggregation
     */
    global DataSource.QueryAggregation aggregation { get; set; }
    /**
     * Name of the selected column.
     * <p>String
     */
    global String columnName { get; set; }
    /**
     * Name of the column’s table.
     * <p>String
     */
    global String tableName { get; set; }

    global Object ColumnSelection() { return null; }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}