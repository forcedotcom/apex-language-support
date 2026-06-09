/**
 * Contains information about the standard filter defined in the report, such as the filter field API name and filter value.
 */
global class StandardFilter {

  global StandardFilter() {}

  /**
   * Return the API name of the standard filter.
   * @return String
   */
  global String getName() {}

  /**
   * Returns the standard filter value.
   * @return String
   */
  global String getValue() {}

  /**
   * Sets the API name of the standard filter.
   * @param name 
   */
  global void setName(String name) {}

  /**
   * Sets the standard filter value.
   * @param value 
   */
  global void setValue(String value) {}

  global Object clone() {}

}