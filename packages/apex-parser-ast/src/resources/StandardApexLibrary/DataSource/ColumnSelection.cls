/**
 * Identifies the list of columns to return during a query or search.
 * Usage
 * This class is associated with the SELECT clause for a SOQL query, or the RETURNING clause for a SOSL query.
 */
global class ColumnSelection {
    /**
     * How to aggregate the column’s data.
     * DataSource.QueryAggregation
     */
    global DataSource.QueryAggregation aggregation { get; set; }
    /**
     * Name of the selected column.
     * String
     */
    global String columnName { get; set; }
    /**
     * Name of the column’s table.
     * String
     */
    global String tableName { get; set; }

    global ColumnSelection() { }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}