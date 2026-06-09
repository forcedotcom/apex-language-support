/**
 * Contains methods for describing fields that contain detailed data. Detailed data fields are also listed in the report metadata.
 */
global class DetailColumn {

  global DetailColumn() {}

  /**
   * Returns the unique API name of the detail column field.
   * @return String
   */
  global String getName() {}

  /**
   * Returns the localized display name of a standard field, the ID of a custom field, or the API name of a bucket field that has detailed data.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the data type of a detail column field.
   * @return Reports.ColumnDataType
   */
  global Reports.ColumnDataType getDataType() {}

  global Object clone() {}

}