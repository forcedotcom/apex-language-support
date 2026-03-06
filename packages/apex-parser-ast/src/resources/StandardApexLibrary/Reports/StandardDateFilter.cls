/**
 * Contains information about standard date filter available in the report—for example, the API name, start date, and end date of the standard date filter duration as well as the API name of the date field on which the filter is placed.
 */
global class StandardDateFilter {

  /**
   * Returns the API name of the standard date filter column.
   * @return String
   */
  public String getColumn() {}

  /**
   * Returns duration information about a standard date filter, such as start date, end date, and display name and API name of the date filter.
   * @return String
   */
  public String getDurationValue() {}

  /**
   * Returns the end date of the standard date filter.
   * @return String
   */
  public String getEndDate() {}

  /**
   * Returns the start date for the standard date filter.
   * @return String
   */
  public String getStartDate() {}

  /**
   * Sets the API name of the standard date filter column.
   * @param standardDateFilterColumnName 
   */
  public void setColumn(String standardDateFilterColumnName) {}

  /**
   * Sets the API name of the standard date filter.
   * @param durationName 
   */
  public void setDurationValue(String durationName) {}

  /**
   * Sets the end date for the standard date filter.
   * @param endDate 
   */
  public void setEndDate(String endDate) {}

  /**
   * Sets the start date for the standard date filter.
   * @param startDate 
   */
  public void setStartDate(String startDate) {}

}