/**
 * Shipping carrier.
 */
global class ShippingCarrierInputRepresentation {

  /**
   * Unique code, reference, or identifier for the shipping carrier used by external systems.
   */
  global String externalReference;

  /**
   * List of shipping carrier methods.
   */
  global List ConnectApi.ShippingCarrierMethodInputRepresentation shippingCarrierMethods;

}