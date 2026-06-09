/**
 * Represents a row in a QuickAction.DescribeLayoutSection .
 */
global class DescribeLayoutRow {

  global DescribeLayoutRow() {}

  /**
   * Returns either a specific field or an empty QuickAction.DescribeLayoutItem (one that contains no QuickAction.DescribeLayoutComponent objects).
   * @return List<QuickAction.DescribeLayoutItem>
   */
  global List<QuickAction.DescribeLayoutItem> getLayoutItems() {}

  /**
   * Returns the number of QuickAction.DescribeLayoutItem .
   * @return Integer
   */
  global Integer getNumItems() {}

  global Object clone() {}

}