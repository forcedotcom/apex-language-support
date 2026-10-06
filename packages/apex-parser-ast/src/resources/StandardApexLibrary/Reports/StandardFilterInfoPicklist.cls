/**
 * Contains information about the standard filter picklist, such as the display name and type of the filter field, the default picklist value, and a list of all possible picklist values.
 */
global class StandardFilterInfoPicklist extends reports.StandardFilterInfo {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the default value for the standard filter picklist.
     */
    global String getDefaultValue() { return null; }

    /**
     * Returns a list of standard filter picklist values.
     */
    global List getFilterValues() { return null; }

    /**
     * Returns the display name of the standard filter picklist.
     */
    global String getLabel() { return null; }

    /**
     * Returns the type of the standard filter picklist.
     */
    global reports.StandardFilterType getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}