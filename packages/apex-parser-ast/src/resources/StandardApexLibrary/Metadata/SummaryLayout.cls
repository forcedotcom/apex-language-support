/**
 * Controls the appearance of the highlights panel, which summarizes key fields in a grid at the top of a page layout, when Case Feed is enabled.
 */
global class SummaryLayout {

  global SummaryLayout() {}

  global String masterLabel;

  global Integer sizeX;

  global Integer sizeY;

  global Integer sizeZ;

  global List<Metadata.SummaryLayoutItem> summaryLayoutItems;

  global Metadata.SummaryLayoutStyleEnum summaryLayoutStyle;

  /**
   * Makes a duplicate copy of the Metadata.SummaryLayout .
   * @return Object
   */
  global Object clone() {}

}