/**
 * Insights associated with a business objective, or goal.
 */
global class BusObjInsightsInputRepresentation {

  global BusObjInsightsInputRepresentation() {}

  /**
   * Target date for completion of the goal.
   */
  global Datetime targetCompletionDate;

  /**
   * Target value for the goal.
   */
  global Double targetValue;

  global Object clone() {}

}