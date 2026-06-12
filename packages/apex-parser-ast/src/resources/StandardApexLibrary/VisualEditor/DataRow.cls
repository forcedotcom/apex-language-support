/**
 * Contains information about one item in a picklist used in a Lightning component on a Lightning page.
 */
global class DataRow {

  global DataRow(String label, Object value, Boolean selected) {}

  global DataRow(String label, Object value) {}

  /**
   * Makes a duplicate copy of the VisualEditor.DataRow object.
   * @return Object
   */
  global Object clone() {}

  /**
   * Compares the current VisualEditor.DataRow object to the specified one. Returns an integer value that is the result of the comparison.
   * @param o A single item in a picklist.
   * @return Integer
   */
  global Integer compareTo(VisualEditor.DataRow o) {}

  /**
   * Returns the user-facing label of the picklist item.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the value of the picklist item.
   * @return Object
   */
  global Object getValue() {}

  /**
   * Returns the state of the picklist item, indicating whether it’s selected or not.
   * @return Boolean
   */
  global Boolean isSelected() {}

}