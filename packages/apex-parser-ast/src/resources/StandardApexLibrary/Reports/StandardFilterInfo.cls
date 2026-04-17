/**
 * Is an abstract base class for an object that provides standard filter information.
 */
global class StandardFilterInfo {

  /**
   * Returns the display label of the standard filter.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the type of standard filter.
   * @return Reports.StandardFilterType
   */
  public Reports.StandardFilterType getType() {}

}