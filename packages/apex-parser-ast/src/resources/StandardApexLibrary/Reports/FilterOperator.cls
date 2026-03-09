/**
 * Contains information about a filter operator, such as display name and API name.
 */
global class FilterOperator {

  /**
   * Returns the localized display name of the filter operator. Possible values for this name are restricted based on the data type of the column being filtered.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the unique API name of the filter operator. Possible values for this name are restricted based on the data type of the column being filtered. For example multipicklist fields can use the following filter operators: “equals,” “not equal to,” “includes,” and “excludes.” Bucket fields are considered to be of the String type.
   * @return String
   */
  public String getName() {}

}