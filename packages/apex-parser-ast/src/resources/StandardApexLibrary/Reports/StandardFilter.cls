/**
 * Contains information about the standard filter defined in the report, such as the filter field API name and filter value.
 * <p>Usage
 * Use to get or set standard filters on a report. Standard filters vary by report type. For example, standard filters for reports on the Opportunity object are Show, Opportunity Status, and Probability.
 */
global class StandardFilter {
    global StandardFilter() { }

    global StandardFilter(String name, String value) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Return the API name of the standard filter.
     */
    global String getName() { return null; }

    /**
     * Returns the standard filter value.
     */
    global String getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the API name of the standard filter.
     */
    global void setName(String name) { }

    /**
     * Sets the standard filter value.
     */
    global void setValue(String value) { }

    global override virtual String toString() { return null; }
}