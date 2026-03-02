/**
 * Represents an individual item in a QuickAction.DescribeLayoutRow .
 */
public class DescribeLayoutItem {

  /**
   * Returns the label text for this item.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns a list of QuickAction.DescribeLayoutComponents for this item.
   * @return List<QuickAction.DescribeLayoutComponent>
   */
  public List<QuickAction.DescribeLayoutComponent> getLayoutComponents() {}

  /**
   * Indicates whether this item can be edited for new ( true ) or not ( false ).
   * @return Boolean
   */
  public Boolean isEditableForNew() {}

  /**
   * Indicates whether this item can be edited for update( true ) or not ( false ).
   * @return Boolean
   */
  public Boolean isEditableForUpdate() {}

  /**
   * Indicates whether this item is a placeholder ( true ) or not ( false ). If true , then this item is blank.
   * @return Boolean
   */
  public Boolean isPlaceholder() {}

  /**
   * Indicates whether this item is required ( true ) or not ( false ).
   * @return Boolean
   */
  public Boolean isRequired() {}

}