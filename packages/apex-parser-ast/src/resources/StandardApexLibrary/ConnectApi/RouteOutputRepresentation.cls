/**
 * A single possible fulfillment route, including its aggregated score and the locations that make up the route.
 */
global class RouteOutputRepresentation {

  global RouteOutputRepresentation() {}

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * The fulfillment locations that make up this route.
   */
  global List < ConnectApi.RouteLocationOutputRepresentation > locations;

  /**
   * Indicates whether the request succeeded.
   */
  global Boolean success;

  /**
   * The aggregated score for this route.
   */
  global Double totalScore;

  global Object clone() {}

}