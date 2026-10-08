/**
 * Contains information about a possible scope value. Scope values depend on the report type. For example, you can set the scope for opportunity reports to All opportunities, My team’s opportunities, or My opportunities.
 */
global class ReportScopeValue {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a boolean value that indicates whether you can segment the report by this scope.
     */
    global Boolean getAllowsDivision() { return false; }

    /**
     * Returns the display name of the scope of the report.
     */
    global String getLabel() { return null; }

    /**
     * Returns the scope value for the report.
     */
    global String getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}