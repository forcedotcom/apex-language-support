/**
 * Represents an item in the related list in a page layout.
 */
global class RelatedListItem {

  global RelatedListItem() {}

  global List<String> customButtons;

  global List<String> excludeButtons;

  global List<String> fields;

  global List<String> quickActions;

  global String relatedList;

  global String sortField;

  global Metadata.SortOrder sortOrder;

  /**
   * Makes a duplicate copy of the Metadata.RelatedListItem .
   * @return Object
   */
  global Object clone() {}

}