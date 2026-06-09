/**
 * You can use ApexPages.Action to create an action method that you can use in a Visualforce custom controller or controller extension.
 */
global class Action {

  global Action(String action) {}

  /**
   * Returns the expression that is evaluated when the action is invoked.
   * @return String
   */
  global String getExpression() {}

  /**
   * Invokes the action.
   * @return System.PageReference
   */
  global System.PageReference invoke() {}

  global Object clone() {}

}