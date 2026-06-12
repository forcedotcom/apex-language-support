/**
 * Contains information about standard date filter available in the report—for example, the API name, start date, and end date of the standard date filter duration as well as the API name of the date field on which the filter is placed.
 */
global class StandardDateFilter {

  global StandardDateFilter() {}

  /**
   * Returns the API name of the standard date filter column.
   * @return String
   */
  global String getColumn() {}

  /**
   * Returns duration information about a standard date filter, such as start date, end date, and display name and API name of the date filter.
   * @return String
   */
  global String getDurationValue() {}

  /**
   * Returns the end date of the standard date filter.
   * @return String
   */
  global String getEndDate() {}

  /**
   * Returns the start date for the standard date filter.
   * @return String
   */
  global String getStartDate() {}

  /**
   * Sets the API name of the standard date filter column.
   * @param standardDateFilterColumnName 
   */
  global void setColumn(String standardDateFilterColumnName) {}

  /**
   * Sets the API name of the standard date filter.
   * @param durationName 
   */
  global void setDurationValue(String durationName) {}

  /**
   * Sets the end date for the standard date filter.
   * @param endDate 
   */
  global void setEndDate(String endDate) {}

  /**
   * Sets the start date for the standard date filter.
   * @param startDate 
   */
  global void setStartDate(String startDate) {}

  global Object clone() {}

}