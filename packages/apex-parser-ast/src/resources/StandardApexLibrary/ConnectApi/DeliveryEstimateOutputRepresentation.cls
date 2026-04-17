/**
 * Delivery estimation information for products.
 */
global class DeliveryEstimateOutputRepresentation {

  /**
   * Any error that was returned, including the error code and error message.
   */
  global ConnectApi.DeliveryEstimationErrorOutputRepresentation error;

  /**
   * Location external reference.
   */
  global String location;

  /**
   * List of product delivery estimations.
   */
  global List ConnectApi.ProductDeliverEstimationOutputRepresentation productDeliverEstimations;

  /**
   * Shipping carrier method external reference.
   */
  global String shippingCarrierMethodExternalReference;

}