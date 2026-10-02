/**
 * Contains information about a filter value, such as the display name and API name.
 */
global class FilterValue {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the localized display name of the filter value. Possible values for this name are restricted based on the data type of the column being filtered.
     */
    global String getLabel() { return null; }

    /**
     * Returns the unique API name of the filter value. Possible values for this name are restricted based on the data type of the column being filtered.
     */
    global String getName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}