/**
 * You can use ApexPages.Action to create an action method that you can use in a Visualforce custom controller or controller extension.
 */
global class Action {

  public Action(String action) {}

  /**
   * Returns the expression that is evaluated when the action is invoked.
   * @return String
   */
  public String getExpression() {}

  /**
   * Invokes the action.
   * @return System.PageReference
   */
  public System.PageReference invoke() {}

}