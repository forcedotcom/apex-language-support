/**
 * Represents an individual item in a QuickAction.DescribeLayoutRow .
 */
global class DescribeLayoutItem {

  global DescribeLayoutItem() {}

  /**
   * Returns the label text for this item.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns a list of QuickAction.DescribeLayoutComponents for this item.
   * @return List<QuickAction.DescribeLayoutComponent>
   */
  global List<QuickAction.DescribeLayoutComponent> getLayoutComponents() {}

  /**
   * Indicates whether this item can be edited for new ( true ) or not ( false ).
   * @return Boolean
   */
  global Boolean isEditableForNew() {}

  /**
   * Indicates whether this item can be edited for update( true ) or not ( false ).
   * @return Boolean
   */
  global Boolean isEditableForUpdate() {}

  /**
   * Indicates whether this item is a placeholder ( true ) or not ( false ). If true , then this item is blank.
   * @return Boolean
   */
  global Boolean isPlaceholder() {}

  /**
   * Indicates whether this item is required ( true ) or not ( false ).
   * @return Boolean
   */
  global Boolean isRequired() {}

  global String getUiBehavior() {}

  global Object clone() {}

}