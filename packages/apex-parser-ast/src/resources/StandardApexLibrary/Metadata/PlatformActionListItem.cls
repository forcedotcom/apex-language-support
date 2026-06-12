/**
 * Represents an action in the platform action list for a layout.
 */
global class PlatformActionListItem {

  global PlatformActionListItem() {}

  global String actionName;

  global Metadata.PlatformActionTypeEnum actionType;

  global Integer sortOrder;

  global String subtype;

  /**
   * Makes a duplicate copy of the Metadata.PlatformActionListItem .
   * @return Object
   */
  global Object clone() {}

}