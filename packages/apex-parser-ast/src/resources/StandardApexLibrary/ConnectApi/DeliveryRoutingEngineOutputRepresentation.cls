/**
 * Delivery routing engine output, including ranked routes and the best fulfillment locations for each SKU.
 */
global class DeliveryRoutingEngineOutputRepresentation {

  global DeliveryRoutingEngineOutputRepresentation() {}

  /**
   * The best fulfillment locations for each SKU. The map key is the SKU string.
   */
  global Map < String , List < ConnectApi.BestLocationPerSKUOutputRepresentation >> bestLocationsPerStockKeepingUnit;

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * Delivery routes ranked by score.
   */
  global List < ConnectApi.RouteOutputRepresentation > routes;

  /**
   * Indicates whether the request succeeded.
   */
  global Boolean success;

  global Object clone() {}

}