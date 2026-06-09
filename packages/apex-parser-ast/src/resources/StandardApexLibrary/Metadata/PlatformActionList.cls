/**
 * Represents the list of actions, and their order, that display in the Salesforce mobile action bar for the layout.
 */
global class PlatformActionList {

  global PlatformActionList() {}

  global Metadata.PlatformActionListContextEnum actionListContext;

  global List<Metadata.PlatformActionListItem> platformActionListItems;

  global String relatedSourceEntity;

  /**
   * Makes a duplicate copy of the Metadata.PlatformActionList .
   * @return Object
   */
  global Object clone() {}

}