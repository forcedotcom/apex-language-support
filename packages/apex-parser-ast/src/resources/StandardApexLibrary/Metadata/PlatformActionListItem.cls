/**
 * Represents an action in the platform action list for a layout.
 */
global class PlatformActionListItem {

  global PlatformActionListItem() {}

  public String actionName;

  public Metadata.PlatformActionTypeEnum actionType;

  public Integer sortOrder;

  public String subtype;

  /**
   * Makes a duplicate copy of the Metadata.PlatformActionListItem .
   * @return Object
   */
  public Object clone() {}

}