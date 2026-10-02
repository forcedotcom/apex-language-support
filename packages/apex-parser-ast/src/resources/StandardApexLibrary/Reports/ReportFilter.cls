/**
 * Contains information about a report filter, including column, operator, and value.
 */
global class ReportFilter {
    /**
     * Creates a new instance of the Reports.ReportFilter class. You can then set values by using the “set” methods.
     */
    global Object ReportFilter() { return null; }

    /**
     * Creates a new instance of the Reports.ReportFilter class by using the specified parameters.
     */
    global Object ReportFilter(String column, String operator, String value) { return null; }

    global Object ReportFilter(String column, String operator, String value, reports.ReportFilterType filterType) { return null; }

    global Object ReportFilter(String column, String operator, String value, reports.ReportFilterType filterType, String entityName) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the unique API name for the field that’s being filtered.
     */
    global String getColumn() { return null; }

    /**
     * Returns the entity name used in the report filter. Use the entity name to handle ambiguous field names across entities, specifically when using cross filters.
     */
    global String getEntityName() { return null; }

    global reports.ReportFilterType getFilterType() { return null; }

    /**
     * Returns the unique API name for the condition that is used to filter a field, such as “greater than” or “not equal to.” Filter conditions depend on the data type of the field.
     */
    global String getOperator() { return null; }

    /**
     * Returns the value that the field is being filtered by. For example, the field Age can be filtered by a numeric value.
     */
    global String getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the unique API name for the field that’s being filtered.
     */
    global void setColumn(String column) { }

    /**
     * Sets the entity name to use in the report filter. Use the entity name to handle ambiguous field names across entities, specifically when using cross filters.
     */
    global void setEntityName(String entityName) { }

    global void setFilterType(reports.ReportFilterType filterType) { }

    /**
     * Sets the type of report filter.
     */
    global void setFilterType(String value) { }

    /**
     * Sets the unique API name for the condition that is used to filter a field, such as “greater than” or “not equal to.” Filter conditions depend on the data type of the field.
     */
    global void setOperator(String operator) { }

    /**
     * Sets the value by which a field can be filtered. For example, the field Age can be filtered by a numeric value.
     */
    global void setValue(String value) { }

    /**
     * Returns a string representation of the filter.
     */
    global override virtual String toString() { return null; }
}