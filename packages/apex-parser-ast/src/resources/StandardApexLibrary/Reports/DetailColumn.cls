/**
 * Contains methods for describing fields that contain detailed data. Detailed data fields are also listed in the report metadata.
 */
global class DetailColumn {

  /**
   * Returns the unique API name of the detail column field.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the localized display name of a standard field, the ID of a custom field, or the API name of a bucket field that has detailed data.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the data type of a detail column field.
   * @return Reports.ColumnDataType
   */
  public Reports.ColumnDataType getDataType() {}

}