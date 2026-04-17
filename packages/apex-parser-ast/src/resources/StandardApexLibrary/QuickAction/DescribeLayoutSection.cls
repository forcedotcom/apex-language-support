/**
 * Represents a section of a layout and consists of one or more columns and one or more rows (an array of QuickAction.DescribeLayoutRow ).
 */
global class DescribeLayoutSection {

  /**
   * Returns the number of columns in the QuickAction.DescribeLayoutSection .
   * @return Integer
   */
  public Integer getColumns() {}

  /**
   * The heading text (label) for the QuickAction.DescribeLayoutSection .
   * @return String
   */
  public String getHeading() {}

  /**
   * Returns an array of one or more QuickAction.DescribeLayoutRow objects.
   * @return List<QuickAction.DescribeLayoutRow>
   */
  public List<QuickAction.DescribeLayoutRow> getLayoutRows() {}

  /**
   * Returns the ID of the record details section in the layout.
   * @return Id
   */
  public Id getLayoutSectionId() {}

  /**
   * Returns the ID of the layout upon which this DescribeLayoutSection resides.
   * @return Id
   */
  public Id getParentLayoutId() {}

  /**
   * Returns the number of rows in the QuickAction.DescribeLayoutSection .
   * @return Integer
   */
  public Integer getRows() {}

  /**
   * Indicates whether the record details section is collapsed ( true ) or expanded ( false ). If you build your own app, you can use this method to see whether the current user collapsed a section, and respect that preference in your own UI.
   * @return Boolean
   */
  public Boolean isCollapsed() {}

  /**
   * Indicates whether the QuickAction.DescribeLayoutSection is a collapsible section ( true ) or not ( false ).
   * @return Boolean
   */
  public Boolean isUseCollapsibleSection() {}

  /**
   * Indicates whether to use the heading ( true ) or not ( false ).
   * @return Boolean
   */
  public Boolean isUseHeading() {}

}