/**
 * Result of an Omnichannel Inventory reservation creation request.
 */
global class OCICreateReservationOutputRepresentation {

  /**
   * Details for each product in the reservation.
   */
  global List < ConnectApi.OCICreateReservationSingleOutputRepresentation > details;

  /**
   * Any errors returned by the reservation request.
   */
  global List < ConnectApi.OCICreateReservationErrorOutputRepresentation > errors;

  /**
   * The time at which the reservation would expire.
   */
  global String expirationTime;

  /**
   * The time when the reservation was recorded.
   */
  global String reservationTime;

  /**
   * Indicates whether the reservation was successfully created.
   */
  global Boolean success;

}