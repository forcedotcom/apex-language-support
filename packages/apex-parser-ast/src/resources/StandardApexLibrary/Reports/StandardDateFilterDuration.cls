/**
 * Contains information about each standard date filter—also referred to as a relative date filter. It contains the API name and display label of the standard date filter duration as well as the start and end dates.
 */
global class StandardDateFilterDuration {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the end date of the date filter.
     */
    global String getEndDate() { return null; }

    /**
     * Returns the display name of the date filter. Possible values are relative date filters—like Current FY and Current FQ—and custom date filters.
     */
    global String getLabel() { return null; }

    /**
     * Returns the start date of the date filter.
     */
    global String getStartDate() { return null; }

    /**
     * Returns the API name of the date filter. Possible values are relative date filters—like THIS_FISCAL_YEAR and NEXT_FISCAL_QUARTER—and custom date filters.
     */
    global String getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}