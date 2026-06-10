/**
 * Is an abstract base class for an object that provides standard filter information.
 */
global class StandardFilterInfo {

  global StandardFilterInfo() {}

  /**
   * Returns the display label of the standard filter.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the type of standard filter.
   * @return Reports.StandardFilterType
   */
  global Reports.StandardFilterType getType() {}

  global Object clone() {}

}