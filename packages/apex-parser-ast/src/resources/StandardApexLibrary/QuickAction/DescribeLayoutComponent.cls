/**
 * Represents the smallest unit in a layout—a field or a separator.
 */
public class DescribeLayoutComponent {

  /**
   * Returns the vertical lines displayed for a field. Applies to textarea and multi-select picklist fields.
   * @return Integer
   */
  public Integer getDisplayLines() {}

  /**
   * Returns the tab order for the item in the row.
   * @return Integer
   */
  public Integer getTabOrder() {}

  /**
   * Returns the name of the QuickAction.DescribeLayoutComponent type for this component.
   * @return String
   */
  public String getType() {}

  /**
   * Returns the name of the field if the type for QuickAction.DescribeLayoutComponent is textarea .
   * @return String
   */
  public String getValue() {}

}