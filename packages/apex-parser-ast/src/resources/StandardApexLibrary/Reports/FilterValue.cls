/**
 * Contains information about a filter value, such as the display name and API name.
 */
global class FilterValue {

  /**
   * Returns the localized display name of the filter value. Possible values for this name are restricted based on the data type of the column being filtered.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the unique API name of the filter value. Possible values for this name are restricted based on the data type of the column being filtered.
   * @return String
   */
  public String getName() {}

}