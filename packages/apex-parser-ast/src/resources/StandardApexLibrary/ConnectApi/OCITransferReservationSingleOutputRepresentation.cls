/**
 * Details of a single transferred reservation.
 */
global class OCITransferReservationSingleOutputRepresentation {

  /**
   * The UUID that identifies the original transfer reservation request.
   */
  global String actionRequestId;

  /**
   * The external reference ID of the location that received the reservation.
   */
  global String externalRefId;

  /**
   * The identifier of the location group that sent the reservation.
   */
  global String fromLocationGroupIdentifier;

  /**
   * The identifier of the location that sent the reservation.
   */
  global String fromLocationIdentifier;

  /**
   * Whether this call ignored availability data at the location that received the reservation.
   */
  global Boolean ignoreAvailabilityCheck;

  /**
   * The quantity of transferred inventory.
   */
  global Double quantity;

  /**
   * The SKU of the transferred product.
   */
  global String stockKeepingUnit;

  /**
   * The identifier of the location group that received the reservation.
   */
  global String toLocationGroupIdentifier;

  /**
   * The identifier of the location that received the reservation.
   */
  global String toLocationIdentifier;

}