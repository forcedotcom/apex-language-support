/**
 * Represents a WHERE clause in a SOSL or SOQL query.
 * <p>Usage
 * Compound types require child filters. Specifically, the subfilters property can’t be null if the type property is NOT_, AND_, or OR_.
 */
global class Filter {
    /**
     * Name of the column that’s being evaluated in a simple comparative type of filter.
     * <p>String
     */
    global String columnName { get; set; }
    /**
     * Value that the filter compares records against in a simple comparative type of filter.
     * <p>Object
     */
    global Object columnValue { get; set; }
    /**
     * List of subfilters for compound filter types, such as NOT_, AND_, and OR_.
     * <p>List<DataSource.Filter>
     */
    global List subfilters { get; set; }
    /**
     * Name of the table whose column is being evaluated in a simple comparative type of filter.
     * <p>String
     */
    global String tableName { get; set; }
    /**
     * Type of filter operation that limits the returned data.
     * <p>DataSource.FilterType
     */
    global DataSource.FilterType type { get; set; }

    global Filter() { }

    global Filter(DataSource.FilterType type, String tableName, String columnName, Object columnValue) { }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}