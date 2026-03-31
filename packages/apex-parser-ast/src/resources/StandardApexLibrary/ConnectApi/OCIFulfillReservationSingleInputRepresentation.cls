/**
 * An inventory reservation to fulfill.
 */
global class OCIFulfillReservationSingleInputRepresentation {

  /**
   * A UUID that identifies the request. Use the action request IDs in response data to identify which requests succeeded or failed.
   */
  global String actionRequestId;

  /**
   * The external reference ID of the location that’s fulfilling the reservation.
   */
  global String externalRefId;

  /**
   * The identifier of the location that’s fulfilling the reservation.
   */
  global String locationIdentifier;

  /**
   * The quantity being fulfilled.
   */
  global Double quantity;

  /**
   * The ID of the inventory reservation.
   */
  global String reservationId;

  /**
   * The SKU of the product being fulfilled.
   */
  global String stockKeepingUnit;

}