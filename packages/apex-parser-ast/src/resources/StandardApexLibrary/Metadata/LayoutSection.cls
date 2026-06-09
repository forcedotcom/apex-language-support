/**
 * Represents a section of a page layout, such as the Custom Links section.
 */
global class LayoutSection {

  global LayoutSection() {}

  global Boolean customLabel;

  global Boolean detailHeading;

  global Boolean editHeading;

  global String label;

  global List<Metadata.LayoutColumn> layoutColumns;

  global Metadata.LayoutSectionStyle style;

  /**
   * Makes a duplicate copy of the Metadata.LayoutSection .
   * @return Object
   */
  global Object clone() {}

}