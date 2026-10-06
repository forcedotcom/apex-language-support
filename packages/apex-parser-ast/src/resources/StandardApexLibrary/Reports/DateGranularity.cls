/**
 * The Reports.DateGranularity enum describes the date interval that is used for grouping.
 * Usage
 * The GroupingInfo.getDateGranularity method returns a Reports.DateGranularity enum value. The GroupingInfo.setDateGranularity method takes the enum value as an argument.
 * Enum Values
 * The following are the values of the Reports.DateGranularity enum.
 */
global enum DateGranularity {
    DAY,
    DAY_IN_MONTH,
    FISCAL_PERIOD,
    FISCAL_QUARTER,
    FISCAL_WEEK,
    FISCAL_YEAR,
    MONTH,
    MONTH_IN_YEAR,
    NONE,
    QUARTER,
    WEEK,
    YEAR

}