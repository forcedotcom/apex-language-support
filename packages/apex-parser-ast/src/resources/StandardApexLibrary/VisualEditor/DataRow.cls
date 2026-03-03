/**
 * Contains information about one item in a picklist used in a Lightning component on a Lightning page.
 */
global class DataRow {

  /**
   * Makes a duplicate copy of the VisualEditor.DataRow object.
   * @return Object
   */
  public Object clone() {}

  /**
   * Compares the current VisualEditor.DataRow object to the specified one. Returns an integer value that is the result of the comparison.
   * @param o A single item in a picklist.
   * @return Integer
   */
  public Integer compareTo(VisualEditor.DataRow o) {}

  /**
   * Returns the user-facing label of the picklist item.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the value of the picklist item.
   * @return Object
   */
  public Object getValue() {}

  /**
   * Returns the state of the picklist item, indicating whether it’s selected or not.
   * @return Boolean
   */
  public Boolean isSelected() {}

}