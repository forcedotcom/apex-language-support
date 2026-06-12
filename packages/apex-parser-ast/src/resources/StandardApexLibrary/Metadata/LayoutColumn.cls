/**
 * Represents the items in a column within a layout section.
 */
global class LayoutColumn {

  global LayoutColumn() {}

  global List<Metadata.LayoutItem> layoutItems;

  global String reserved;

  /**
   * Makes a duplicate copy of the Metadata.LayoutColumn .
   * @return Object
   */
  global Object clone() {}

}