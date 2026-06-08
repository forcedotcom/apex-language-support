/**
 * Represents the list of actions, and their order, that display in the Salesforce mobile action bar for the layout.
 */
global class PlatformActionList {

  global PlatformActionList() {}

  public Metadata.PlatformActionListContextEnum actionListContext;

  public List<Metadata.PlatformActionListItem> platformActionListItems;

  public String relatedSourceEntity;

  /**
   * Makes a duplicate copy of the Metadata.PlatformActionList .
   * @return Object
   */
  public Object clone() {}

}