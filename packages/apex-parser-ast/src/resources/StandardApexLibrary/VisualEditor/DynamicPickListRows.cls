/**
 * Contains a list of picklist items in a Lightning component on a Lightning page.
 */
global class DynamicPickListRows {

  /**
   * Adds a list of picklist items to a dynamic picklist rendered in a Lightning component on a Lightning page.
   * @param rows List of picklist items.
   */
  public void addAllRows(List<VisualEditor.DataRow> rows) {}

  /**
   * Adds a single picklist item to a dynamic picklist rendered in a Lightning component on a Lightning page.
   * @param row A single picklist item.
   */
  public void addRow(VisualEditor.DataRow row) {}

  /**
   * Makes a duplicate copy of the VisualEditor.DynamicPickListRows object.
   * @return Object
   */
  public Object clone() {}

  /**
   * Returns a Boolean value indicating whether all values of the picklist are included when a user does a type-ahead search query (true) or only those values initially displayed when the list is clicked on (false).
   * @return Boolean
   */
  public Boolean containsAllRows() {}

  /**
   * Returns a picklist element stored at the specified index.
   * @param i The index.
   * @return VisualEditor.DataRow
   */
  public VisualEditor.DataRow get(Integer i) {}

  /**
   * Returns a list of picklist items.
   * @return List<VisualEditor.DataRow>
   */
  public List<VisualEditor.DataRow> getDataRows() {}

  /**
   * Sets the value indicating whether all values of the picklist are included when a user does a type-ahead search query (true) or only those values initially displayed when the list is clicked on (false).
   * @param containsAllRows Indicates if all values of the picklist are included in a type-ahead search query (true) or only those values initially displayed when the list is clicked on (false).
   */
  public void setContainsAllRows(Boolean containsAllRows) {}

  /**
   * Returns the size of the list of VisualEditor.DynamicPickListRows .
   * @return Integer
   */
  public Integer size() {}

  /**
   * Sorts the list of VisualEditor.DynamicPickListRows .
   */
  public void sort() {}

}