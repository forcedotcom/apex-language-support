/**
 * Represents custom console components (Visualforce pages, lookup fields, or related lists) on a page layout.
 */
global class CustomConsoleComponents {

  global CustomConsoleComponents() {}

  global Metadata.PrimaryTabComponents primaryTabComponents;

  global Metadata.SubtabComponents subtabComponents;

  /**
   * Makes a duplicate copy of the Metadata.CustomConsoleComponents .
   * @return Object
   */
  global Object clone() {}

}