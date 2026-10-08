/**
 * Contains information about possible scope values that you can choose. Scope values depend on the report type. For example, you can set the scope for opportunity reports to All opportunities, My team’s opportunities, or My opportunities.
 */
global class ReportScopeInfo {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the default scope of the data to display in the report.
     */
    global String getDefaultValue() { return null; }

    /**
     * Returns a list of scope values specified for the report.
     */
    global List getValues() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}