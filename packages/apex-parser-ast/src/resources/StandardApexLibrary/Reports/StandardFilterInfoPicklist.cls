/**
 * Contains information about the standard filter picklist, such as the display name and type of the filter field, the default picklist value, and a list of all possible picklist values.
 */
global class StandardFilterInfoPicklist {

  global StandardFilterInfoPicklist() {}

  /**
   * Returns the default value for the standard filter picklist.
   * @return String
   */
  global String getDefaultValue() {}

  /**
   * Returns a list of standard filter picklist values.
   * @return List<Reports.FilterValue>
   */
  global List<Reports.FilterValue> getFilterValues() {}

  /**
   * Returns the display name of the standard filter picklist.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the type of the standard filter picklist.
   * @return Reports.StandardFilterType
   */
  global Reports.StandardFilterType getType() {}

  global Object clone() {}

}