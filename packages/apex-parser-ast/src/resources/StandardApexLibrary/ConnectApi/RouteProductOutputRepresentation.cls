/**
 * A product allocated to a fulfillment location within a route, including its allocated quantity and score.
 */
global class RouteProductOutputRepresentation {

  global RouteProductOutputRepresentation() {}

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * The product's SKU.
   */
  global String product;

  /**
   * The product quantity allocated to this location.
   */
  global Integer quantity;

  /**
   * Indicates whether the request succeeded.
   */
  global Boolean success;

  /**
   * The score for this product at this location.
   */
  global Double unitScore;

  global Object clone() {}

}