/**
 * Controls the appearance of an individual field and its column and row position within the highlights panel grid, when Case Feed is enabled. You can have two fields per each grid in a highlights panel.
 */
global class SummaryLayoutItem {

  global SummaryLayoutItem() {}

  global String customLink;

  global String field;

  global Integer posX;

  global Integer posY;

  global Integer posZ;

  /**
   * Makes a duplicate copy of the Metadata.SummaryLayoutItem .
   * @return Object
   */
  global Object clone() {}

}