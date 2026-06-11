/**
 * Represents a mini view of a record in the Console tab, hover details, and event overlays.
 */
global class MiniLayout {

  global MiniLayout() {}

  global List<String> fields;

  global List<Metadata.RelatedListItem> relatedLists;

  /**
   * Makes a duplicate copy of the Metadata.MiniLayout .
   * @return Object
   */
  global Object clone() {}

}