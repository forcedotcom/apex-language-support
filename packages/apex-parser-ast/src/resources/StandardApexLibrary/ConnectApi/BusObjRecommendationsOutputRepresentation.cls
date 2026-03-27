/**
 * Details of the recommended actions for a business objective, or goal.
 */
global class BusObjRecommendationsOutputRepresentation {

  /**
   * Count of active recommended actions.
   */
  global Integer active;

  /**
   * Count of completed recommended actions.
   */
  global Integer complete;

  /**
   * Count of total recommended actions, including both completed and active.
   */
  global Integer total;

}