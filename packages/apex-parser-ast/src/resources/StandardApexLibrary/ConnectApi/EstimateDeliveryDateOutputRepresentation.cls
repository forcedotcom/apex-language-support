/**
 * Estimated delivery dates.
 */
global class EstimateDeliveryDateOutputRepresentation {

  /**
   * List of delivery estimations.
   */
  global List ConnectApi.DeliveryEstimateOutputRepresentation deliveryEstimates;

  /**
   * Unique code, reference, or identifier for the estimated delivery used by external systems.
   */
  global String estimatedDeliveryReference;

}