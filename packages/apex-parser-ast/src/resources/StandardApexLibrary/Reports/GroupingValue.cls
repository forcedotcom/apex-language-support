/**
 * Contains grouping values for a row or column, including the key, label, and value.
 */
global class GroupingValue {

  global GroupingValue() {}

  /**
   * Returns a list of second- or third-level row or column groupings. If there are none, the value is an empty array.
   * @return LIST<Reports.GroupingValue>
   */
  global LIST<Reports.GroupingValue> getGroupings() {}

  /**
   * Returns the unique identifier for a row or column grouping. The identifier is used by the fact map to specify data values within each grouping.
   * @return String
   */
  global String getKey() {}

  /**
   * Returns the localized display name of a row or column grouping. For date and time fields, the label is the localized date or time.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the value of the field that is used as a row or column grouping.
   * @return Object
   */
  global Object getValue() {}

  global Object clone() {}

}