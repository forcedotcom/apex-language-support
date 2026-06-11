/**
 * A parameter for an action.
 */
global class NBAActionParameter {

  global NBAActionParameter() {}

  /**
   * Name of the parameter.
   */
  global String name;

  /**
   * Type of the parameter.
   */
  global String type;

  /**
   * Value of the parameter.
   */
  global String value;

  global Object clone() {}

}