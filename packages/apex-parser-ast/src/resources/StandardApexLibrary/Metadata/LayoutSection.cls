/**
 * Represents a section of a page layout, such as the Custom Links section.
 */
global class LayoutSection {

  global LayoutSection() {}

  public Boolean customLabel;

  public Boolean detailHeading;

  public Boolean editHeading;

  public String label;

  public List<Metadata.LayoutColumn> layoutColumns;

  public Metadata.LayoutSectionStyle style;

  /**
   * Makes a duplicate copy of the Metadata.LayoutSection .
   * @return Object
   */
  public Object clone() {}

}