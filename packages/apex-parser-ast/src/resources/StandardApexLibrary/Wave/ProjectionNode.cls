/**
 * Add aggregate functions to the query, or define an alias.
 * Usage
 * Refer to the QueryBuilder example.
 */
global virtual class ProjectionNode {
    /**
     * Define output column names.
     */
    global wave.ProjectionNode alias(String name) { return null; }

    /**
     * Returns the average value of a numeric field.
     */
    global wave.ProjectionNode avg() { return null; }

    global String build() { return null; }

    /**
     * Returns the number of rows that match the query criteria.
     */
    global wave.ProjectionNode count() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns the maximum value of a field.
     */
    global wave.ProjectionNode max() { return null; }

    /**
     * Returns the minimum value of a field.
     */
    global wave.ProjectionNode min() { return null; }

    /**
     * Returns the sum of a numeric field.
     */
    global wave.ProjectionNode sum() { return null; }

    global override virtual String toString() { return null; }

    /**
     * Returns the count of unique values.
     */
    global wave.ProjectionNode unique() { return null; }
}