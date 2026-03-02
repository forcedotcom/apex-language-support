/**
 * Contains describe metadata information for a quick action that is available for a specified parent.
 */
public class DescribeAvailableQuickActionResult {

  /**
   * Returns the unique ID for the action. If the action doesn’t have an ID, its API name is used.
   * @return String
   */
  public String getActionEnumOrId() {}

  /**
   * The quick action label.
   * @return String
   */
  public String getLabel() {}

  /**
   * The quick action name.
   * @return String
   */
  public String getName() {}

  /**
   * The quick action type.
   * @return String
   */
  public String getType() {}

}