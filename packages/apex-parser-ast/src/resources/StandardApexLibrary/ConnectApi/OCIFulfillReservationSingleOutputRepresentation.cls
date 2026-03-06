/**
 * Details of a single fulfilled reservation.
 */
global class OCIFulfillReservationSingleOutputRepresentation {

  /**
   * The UUID that identifies the original fulfill reservation request.
   */
  global String actionRequestId;

  /**
   * The external reference ID of the location that fulfilled the reservation.
   */
  global String externalRefId;

  /**
   * The identifier of the location that fulfilled the reservation.
   */
  global String locationIdentifier;

  /**
   * The fulfilled quantity.
   */
  global Double quantity;

  /**
   * The SKU of the fulfilled product.
   */
  global String stockKeepingUnit;

}