/**
 * Contains detailed report type metadata about a field, including data type, display name, and filter values.
 */
global class ReportTypeColumn {

  /**
   * Returns the data type of the field.
   * @return Reports.ColumnDataType
   */
  public Reports.ColumnDataType getDataType() {}

  /**
   * If the field data type is picklist, multi-select picklist, boolean, or checkbox, returns all filter values for a field. For example, checkbox fields always have a value of true or false . For fields of other data types, the filter value is an empty array, because their values can’t be determined.
   * @return LIST<Reports.FilterValue>
   */
  public LIST<Reports.FilterValue> getFilterValues() {}

  /**
   * If the field is of a type that can’t be filtered, returns False . For example, fields of the type Encrypted Text can’t be filtered.
   * @return Boolean
   */
  public Boolean getFilterable() {}

  /**
   * Returns the localized display name of the field.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the unique API name of the field.
   * @return String
   */
  public String getName() {}

}