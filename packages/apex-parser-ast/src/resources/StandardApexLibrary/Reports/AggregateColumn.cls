/**
 * Contains methods for describing summary fields such as Record Count, Sum, Average, Max, Min, and custom summary formulas. Includes name, label, data type, and grouping context.
 */
global class AggregateColumn {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the column grouping in the report where the summary field is displayed.
     */
    global String getAcrossGroupingContext() { return null; }

    /**
     * Returns the data type of the summarized or custom summary formula field.
     */
    global reports.ColumnDataType getDataType() { return null; }

    /**
     * Returns the row grouping in the report where the summary field is displayed.
     */
    global String getDownGroupingContext() { return null; }

    /**
     * Returns the localized display name for the summarized or custom summary formula field.
     */
    global String getLabel() { return null; }

    /**
     * Returns the unique API name of the summary field.
     */
    global String getName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}