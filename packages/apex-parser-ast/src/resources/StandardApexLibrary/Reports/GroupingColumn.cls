/**
 * Contains methods for describing fields that are used for column grouping.
 * The GroupingColumn class provides basic information about column grouping fields. The GroupingInfo class includes additional methods for describing and updating grouping fields.
 */
global class GroupingColumn {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the data type of the field that is used for column grouping.
     */
    global reports.ColumnDataType getDataType() { return null; }

    /**
     * Returns the level of grouping for the column.
     * Usage
     * In a summary report, 0, 1, or 2 indicates grouping at the first, second, or third row level.
     * In a matrix report, 0 or 1 indicates grouping at the first or second row or column level.
     */
    global Integer getGroupingLevel() { return 0; }

    /**
     * Returns the localized display name of the field that is used for column grouping.
     */
    global String getLabel() { return null; }

    /**
     * Returns the unique API name of the field or bucket field that is used for column grouping.
     */
    global String getName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}