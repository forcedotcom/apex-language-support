/**
 * Represents a section of a layout and consists of one or more columns and one or more rows (an array of QuickAction.DescribeLayoutRow ).
 */
global class DescribeLayoutSection {

  global DescribeLayoutSection() {}

  global Boolean collapsed;

  global Id layoutsectionid;

  /**
   * Returns the number of columns in the QuickAction.DescribeLayoutSection .
   * @return Integer
   */
  global Integer getColumns() {}

  /**
   * The heading text (label) for the QuickAction.DescribeLayoutSection .
   * @return String
   */
  global String getHeading() {}

  /**
   * Returns an array of one or more QuickAction.DescribeLayoutRow objects.
   * @return List<QuickAction.DescribeLayoutRow>
   */
  global List<QuickAction.DescribeLayoutRow> getLayoutRows() {}

  /**
   * Returns the ID of the record details section in the layout.
   * @return Id
   */
  global Id getLayoutSectionId() {}

  /**
   * Returns the ID of the layout upon which this DescribeLayoutSection resides.
   * @return Id
   */
  global Id getParentLayoutId() {}

  /**
   * Returns the number of rows in the QuickAction.DescribeLayoutSection .
   * @return Integer
   */
  global Integer getRows() {}

  /**
   * Indicates whether the record details section is collapsed ( true ) or expanded ( false ). If you build your own app, you can use this method to see whether the current user collapsed a section, and respect that preference in your own UI.
   * @return Boolean
   */
  global Boolean isCollapsed() {}

  /**
   * Indicates whether the QuickAction.DescribeLayoutSection is a collapsible section ( true ) or not ( false ).
   * @return Boolean
   */
  global Boolean isUseCollapsibleSection() {}

  /**
   * Indicates whether to use the heading ( true ) or not ( false ).
   * @return Boolean
   */
  global Boolean isUseHeading() {}

  global String getTabOrder() {}

  global Object clone() {}

}