/**
 * Contains report type metadata, which gives you information about the fields that are available in each section of the report type, plus filter information for those fields.
 */
global class ReportTypeMetadata {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns all fields in the report type. The fields are organized by section.
     */
    global List getCategories() { return null; }

    /**
     * Returns the default division and a list of all possible divisions that can be applied to this type of report.
     */
    global reports.ReportDivisionInfo getDivisionInfo() { return null; }

    /**
     * Returns information about the scopes that can be applied to this type of report.
     */
    global reports.ReportScopeInfo getScopeInfo() { return null; }

    /**
     * Returns information about the standard date filter groupings that can be applied to this type of report. Standard date filter groupings include Calendar Year, Calendar Quarter, Calendar Month, Calendar Week, Fiscal Year, Fiscal Quarter, Day and a custom value based on a user-defined date range.
     */
    global List getStandardDateFilterDurationGroups() { return null; }

    /**
     * Returns information about standard date filters that can be applied to this type of report.
     */
    global Map getStandardFilterInfos() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}