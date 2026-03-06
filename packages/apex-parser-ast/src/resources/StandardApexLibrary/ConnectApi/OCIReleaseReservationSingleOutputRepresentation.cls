/**
 * Details of a single released reservation.
 */
global class OCIReleaseReservationSingleOutputRepresentation {

  /**
   * The UUID that identifies the original release reservation request.
   */
  global String actionRequestId;

  /**
   * The external reference ID of the location that released the reservation.
   */
  global String externalRefId;

  /**
   * The identifier of the location group that released the reservation.
   */
  global String locationGroupIdentifier;

  /**
   * The identifier of the location that released the reservation.
   */
  global String locationIdentifier;

  /**
   * The released quantity.
   */
  global Double quantity;

  /**
   * The SKU of the released product.
   */
  global String stockKeepingUnit;

}