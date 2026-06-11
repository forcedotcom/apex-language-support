/**
 * A fulfillment location within a route, including the products fulfilled from that location.
 */
global class RouteLocationOutputRepresentation {

  global RouteLocationOutputRepresentation() {}

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * The location's ID.
   */
  global String location;

  /**
   * Products fulfilled from this location.
   */
  global List < ConnectApi.RouteProductOutputRepresentation > products;

  /**
   * Indicates whether the request succeeded.
   */
  global Boolean success;

  global Object clone() {}

}