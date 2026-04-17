/**
 * Fulfillment order capacity values for a location.
 */
global class LocationCapacityOutputRepresentation {

  /**
   * Value of the location’s Assigned Fulfillment Order Count.
   */
  global Integer assigned;

  /**
   * Value of the location’s Fulfillment Order Capacity. This property represents the location’s maximum capacity.
   */
  global Integer capacity;

  /**
   * Error returned by the request, if any.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Number of fulfillment orders that the location is holding capacity for.
   */
  global Integer heldCapacity;

  /**
   * ID of the location.
   */
  global String locationId;

}