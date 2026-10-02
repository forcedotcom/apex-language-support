/**
 * Specifies how to aggregate a column in a query.
 * <p>Usage
 * Used by the aggregation property on the DataSource.ColumnSelection class.
 * <p>Enum Values
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