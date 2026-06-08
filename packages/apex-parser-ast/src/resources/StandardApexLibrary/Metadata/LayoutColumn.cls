/**
 * Represents the items in a column within a layout section.
 */
global class LayoutColumn {

  global LayoutColumn() {}

  public List<Metadata.LayoutItem> layoutItems;

  public String reserved;

  /**
   * Makes a duplicate copy of the Metadata.LayoutColumn .
   * @return Object
   */
  public Object clone() {}

}