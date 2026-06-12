/**
 * Result of executing a commerce action.
 */
global class CommerceActionResult {

  global CommerceActionResult() {}

  /**
   * Specifies whether the action is a success ( true ) or not ( false ).
   */
  global Boolean isSuccess;

  /**
   * Action result message.
   */
  global String message;

  global Object clone() {}

}