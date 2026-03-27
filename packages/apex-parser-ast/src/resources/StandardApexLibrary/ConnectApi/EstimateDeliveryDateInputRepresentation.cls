/**
 * Delivery date estimation information.
 */
global class EstimateDeliveryDateInputRepresentation {

  /**
   * Delivery address.
   */
  global ConnectApi.DeliveryAddressInputRepresentation deliveryAddress;

  /**
   * List of location external references.
   */
  global String locations;

  /**
   * List of products included in delivery estimation.
   */
  global ConnectApi.DeliveryEstimationProductInputRepresentation products;

  /**
   * Shipping carrier used to deliver the order.
   */
  global ConnectApi.ShippingCarrierInputRepresentation shippingCarrier;

}