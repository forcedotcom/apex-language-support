/**
 * Contains information about the standard date filter groupings, such as the grouping display label and all standard date filters that fall under the grouping. Groupings include Calendar Year , Calendar Quarter , Calendar Month , Calendar Week , Fiscal Year , Fiscal Quarter , Day , and custom values based on user-defined date ranges.
 */
global class StandardDateFilterDurationGroup {

  global StandardDateFilterDurationGroup() {}

  /**
   * Returns the display label for the standard date filter grouping.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the standard date filter groupings.
   * @return List<Reports.StandardDateFilterDuration>
   */
  global List<Reports.StandardDateFilterDuration> getStandardDateFilterDurations() {}

  global Object clone() {}

}