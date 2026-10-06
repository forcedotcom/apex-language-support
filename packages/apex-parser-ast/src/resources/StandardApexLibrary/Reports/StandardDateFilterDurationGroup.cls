/**
 * Contains information about the standard date filter groupings, such as the grouping display label and all standard date filters that fall under the grouping. Groupings include Calendar Year, Calendar Quarter, Calendar Month, Calendar Week, Fiscal Year, Fiscal Quarter, Day, and custom values based on user-defined date ranges.
 */
global class StandardDateFilterDurationGroup {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the display label for the standard date filter grouping.
     */
    global String getLabel() { return null; }

    /**
     * Returns the standard date filter groupings.
     * @return For example, a standard filter date grouping might look like this:
     * Reports.StandardDateFilterDuration[endDate=2015-12-31, label=Current FY, startDate=2015-01-01, value=THIS_FISCAL_YEAR],
     * Reports.StandardDateFilterDuration[endDate=2014-12-31, label=Previous FY, startDate=2014-01-01, value=LAST_FISCAL_YEAR],
     * Reports.StandardDateFilterDuration[endDate=2014-12-31, label=Previous 2 FY, startDate=2013-01-01, value=LAST_N_FISCAL_YEARS:2]
     */
    global List getStandardDateFilterDurations() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}