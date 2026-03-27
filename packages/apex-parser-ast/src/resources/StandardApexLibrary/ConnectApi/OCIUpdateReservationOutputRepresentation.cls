/**
 * Result of an Omnichannel Inventory update request for reserved inventory.
 */
global class OCIUpdateReservationOutputRepresentation {

  /**
   * Details for each product in the reservation.
   */
  global List ConnectApi.OCIUpdateReservationSingleOutputRepresentation [] details;

  /**
   * Any errors returned by the reservation update request.
   */
  global List ConnectApi.OCIUpdateReservationErrorOutputRepresentation [] errors;

  /**
   * The time when the reservation was updated.
   */
  global String reservationTime;

  /**
   * Indicates whether the reservation was successfully updated.
   */
  global Boolean success;

}