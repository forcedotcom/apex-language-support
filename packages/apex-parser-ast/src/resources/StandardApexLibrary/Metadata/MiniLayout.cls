/**
 * Represents a mini view of a record in the Console tab, hover details, and event overlays.
 */
global class MiniLayout {

  global MiniLayout() {}

  public List<String> fields;

  public List<Metadata.RelatedListItem> relatedLists;

  /**
   * Makes a duplicate copy of the Metadata.MiniLayout .
   * @return Object
   */
  public Object clone() {}

}