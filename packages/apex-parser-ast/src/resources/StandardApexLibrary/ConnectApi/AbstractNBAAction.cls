/**
 * A recommended action of recommendation strategy.
 */
global class AbstractNBAAction {

  global AbstractNBAAction() {}

  /**
   * List of parameters to pass to the action.
   */
  global List < ConnectApi.NBAActionParameter > parameters;

  /**
   * Type of action. Values are: Flow —Automated process tool with multiple subtypes.
   */
  global ConnectApi.NBAActionType type;

  global Object clone() {}

}