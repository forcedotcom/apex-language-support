/**
 * Contains details about how to sort the rows in the result set. Equivalent to an ORDER BY statement in a SOQL query.
 * Usage
 * Used in the order property on the DataSource.TableSelection class.
 */
global class Order {
    /**
     * Name of the column whose values are used to sort the rows in the result set.
     * String
     */
    global String columnName { get; set; }
    /**
     * Direction for sorting rows based on column values.
     * DataSource.OrderDirection
     */
    global DataSource.OrderDirection direction { get; set; }
    /**
     * Name of the table whose column values are used to sort the rows in the result set.
     * String
     */
    global String tableName { get; set; }

    global Order() { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Creates an instance of the DataSource.Order class.
     */
    global static DataSource.Order get(String tableName, String columnName, DataSource.OrderDirection direction) { return null; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}