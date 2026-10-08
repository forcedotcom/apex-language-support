/**
 * Contains methods for describing fields that contain detailed data. Detailed data fields are also listed in the report metadata.
 */
global class DetailColumn {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the data type of a detail column field.
     */
    global reports.ColumnDataType getDataType() { return null; }

    /**
     * Returns the localized display name of a standard field, the ID of a custom field, or the API name of a bucket field that has detailed data.
     */
    global String getLabel() { return null; }

    /**
     * Returns the unique API name of the detail column field.
     */
    global String getName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}