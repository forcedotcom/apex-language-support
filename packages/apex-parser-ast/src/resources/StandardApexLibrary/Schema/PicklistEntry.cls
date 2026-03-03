/**
 * Represents a picklist entry.
 */
global class PicklistEntry {

  /**
   * Returns the display name of this item in the picklist.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the value of this item in the picklist.
   * @return String
   */
  public String getValue() {}

  /**
   * Returns true if this item must be displayed in the drop-down list for the picklist field in the user interface, false otherwise.
   * @return Boolean
   */
  public Boolean isActive() {}

  /**
   * Returns true if this item is the default value for the picklist, false otherwise. Only one item in a picklist can be designated as the default.
   * @return Boolean
   */
  public Boolean isDefaultValue() {}

}