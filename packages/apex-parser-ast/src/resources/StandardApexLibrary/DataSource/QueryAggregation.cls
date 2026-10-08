/**
 * Specifies how to aggregate a column in a query.
 * Usage
 * Used by the aggregation property on the DataSource.ColumnSelection class.
 * Enum Values
 * The following are the values of the DataSource.QueryAggregation enum.
 */
global enum QueryAggregation {
    AVG,
    COUNT,
    MAX,
    MIN,
    NONE,
    SUM

}