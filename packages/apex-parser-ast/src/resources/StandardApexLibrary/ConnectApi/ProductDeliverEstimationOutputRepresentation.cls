/**
 * Delivery estimation information for each product.
 */
global class ProductDeliverEstimationOutputRepresentation {

  /**
   * Estimated delivery date.
   */
  global Datetime ConnectApi.EstimateDeliveryDateOutputRepresentation estimatedDeliveryDate;

  /**
   * Estimated shipping date.
   */
  global Datetime estimatedShipDate;

  /**
   * Product quantity.
   */
  global Double quantity;

  /**
   * Routing calculation type.
   */
  global String routingCalculationType;

  /**
   * Product stock keeping unit (SKU).
   */
  global String stockKeepingUnit;

}