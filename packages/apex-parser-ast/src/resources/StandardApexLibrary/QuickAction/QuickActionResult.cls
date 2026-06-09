/**
 * After you initiate a quick action with the QuickAction class, use the QuickActionResult class for processing action results.
 */
global class QuickActionResult {

  global QuickActionResult() {}

  /**
   * If an error occurs, an array of one or more database error objects, along with error codes and descriptions, is returned.
   * @return List<Database.Error>
   */
  global List<Database.Error> getErrors() {}

  /**
   * The IDs of the QuickActions being processed.
   * @return List<Id>
   */
  global List<Id> getIds() {}

  /**
   * Returns the success message associated with the quick action.
   * @return String
   */
  global String getSuccessMessage() {}

  /**
   * Returns true if the action is created; otherwise, false .
   * @return Boolean
   */
  global Boolean isCreated() {}

  /**
   * Returns true if the action completes successfully; otherwise, false .
   * @return Boolean
   */
  global Boolean isSuccess() {}

  global Id getContextId() {}

  global Object clone() {}

}