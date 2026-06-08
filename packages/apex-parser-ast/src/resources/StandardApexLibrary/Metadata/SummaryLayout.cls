/**
 * Controls the appearance of the highlights panel, which summarizes key fields in a grid at the top of a page layout, when Case Feed is enabled.
 */
global class SummaryLayout {

  global SummaryLayout() {}

  public String masterLabel;

  public Integer sizeX;

  public Integer sizeY;

  public Integer sizeZ;

  public List<Metadata.SummaryLayoutItem> summaryLayoutItems;

  public Metadata.SummaryLayoutStyleEnum summaryLayoutStyle;

  /**
   * Makes a duplicate copy of the Metadata.SummaryLayout .
   * @return Object
   */
  public Object clone() {}

}