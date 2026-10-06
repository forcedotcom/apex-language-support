/**
 * Contains detailed report type metadata about a field, including data type, display name, and filter values.
 */
global class ReportTypeColumn {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the data type of the field.
     */
    global reports.ColumnDataType getDataType() { return null; }

    /**
     * If the field data type is picklist, multi-select picklist, boolean, or checkbox, returns all filter values for a field. For example, checkbox fields always have a value of true or false. For fields of other data types, the filter value is an empty array, because their values can’t be determined.
     */
    global List getFilterValues() { return null; }

    /**
     * If the field is of a type that can’t be filtered, returns False. For example, fields of the type Encrypted Text can’t be filtered.
     */
    global Boolean getFilterable() { return false; }

    /**
     * Returns the localized display name of the field.
     */
    global String getLabel() { return null; }

    /**
     * Returns the unique API name of the field.
     */
    global String getName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}