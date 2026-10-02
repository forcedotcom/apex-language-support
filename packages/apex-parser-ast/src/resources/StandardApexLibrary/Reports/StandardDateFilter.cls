/**
 * Contains information about standard date filter available in the report—for example, the API name, start date, and end date of the standard date filter duration as well as the API name of the date field on which the filter is placed.
 */
global class StandardDateFilter {
    global Object StandardDateFilter() { return null; }

    global Object StandardDateFilter(String column, String durationValue, String startDate, String endDate) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the API name of the standard date filter column.
     */
    global String getColumn() { return null; }

    /**
     * Returns duration information about a standard date filter, such as start date, end date, and display name and API name of the date filter.
     */
    global String getDurationValue() { return null; }

    /**
     * Returns the end date of the standard date filter.
     */
    global String getEndDate() { return null; }

    /**
     * Returns the start date for the standard date filter.
     */
    global String getStartDate() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the API name of the standard date filter column.
     */
    global void setColumn(String column) { }

    /**
     * Sets the API name of the standard date filter.
     */
    global void setDurationValue(String durationValue) { }

    /**
     * Sets the end date for the standard date filter.
     */
    global void setEndDate(String endDate) { }

    /**
     * Sets the start date for the standard date filter.
     */
    global void setStartDate(String startDate) { }

    global override virtual String toString() { return null; }
}