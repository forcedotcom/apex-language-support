/**
 * A single inventory reservation to release.
 */
global class OCIReleaseReservationSingleInputRepresentation {

  /**
   * A UUID that identifies the request. Use the action request IDs in response data to identify which requests succeeded or failed.
   */
  global String actionRequestId;

  /**
   * The external reference ID of the location or location group that has the reservation.
   */
  global String externalRefId;

  /**
   * The identifier of the location group that has the reservation.
   */
  global String locationGroupIdentifier;

  /**
   * The identifier of the location that has the reservation.
   */
  global String locationIdentifier;

  /**
   * The quantity of reserved inventory to release.
   */
  global Double quantity;

  /**
   * The ID of the inventory reservation.
   */
  global String reservationId;

  /**
   * The SKU of the product to release.
   */
  global String stockKeepingUnit;

}