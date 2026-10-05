/**
 * Contains a breakdown of the SOQL or SOSL query. Its properties represent the FROM, ORDER BY, SELECT, and WHERE clauses in the query.
 */
global class TableSelection {
    /**
     * List of columns to query. Corresponds to the SELECT clause in a SOQL or SOSL query.
     * <p>List<DataSource.ColumnSelection>
     */
    global List columnsSelected { get; set; }
    /**
     * Identifies the query filter, which can be a compound filter that has a list of subfilters. The filter corresponds to the WHERE clause in a SOQL or SOSL query.
     * <p>DataSource.Filter
     */
    global DataSource.Filter filter { get; set; }
    /**
     * Identifies the order for sorting the query results. Corresponds to the ORDER BY clause in a SOQL or SOSL query.
     * <p>List<DataSource.Order>
     */
    global List order { get; set; }
    /**
     * Name of the table to query. Corresponds to the FROM clause in a SOQL or SOSL query.
     * <p>String
     */
    global String tableSelected { get; set; }

    global TableSelection() { }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}