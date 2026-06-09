/**
 * Contains describe metadata information for a quick action that is available for a specified parent.
 */
global class DescribeAvailableQuickActionResult {

  global DescribeAvailableQuickActionResult() {}

  /**
   * Returns the unique ID for the action. If the action doesn’t have an ID, its API name is used.
   * @return String
   */
  global String getActionEnumOrId() {}

  /**
   * The quick action label.
   * @return String
   */
  global String getLabel() {}

  /**
   * The quick action name.
   * @return String
   */
  global String getName() {}

  /**
   * The quick action type.
   * @return String
   */
  global String getType() {}

  global Object clone() {}

}