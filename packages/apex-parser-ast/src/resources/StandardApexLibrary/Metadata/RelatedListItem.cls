/**
 * Represents an item in the related list in a page layout.
 */
global class RelatedListItem {

  global RelatedListItem() {}

  public List<String> customButtons;

  public List<String> excludeButtons;

  public List<String> fields;

  public List<String> quickActions;

  public String relatedList;

  public String sortField;

  public Metadata.SortOrder sortOrder;

  /**
   * Makes a duplicate copy of the Metadata.RelatedListItem .
   * @return Object
   */
  public Object clone() {}

}