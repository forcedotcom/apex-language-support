/**
 * Response to a request to fulfill one inventory reservation.
 */
global class OCIFulfillReservationErrorOutputRepresentation {

  /**
   * Details of the fulfilled reservation, if successful.
   */
  global ConnectApi.OCIFulfillReservationSingleOutputRepresentation details;

  /**
   * Error code, if any.
   */
  global String errorCode;

  /**
   * Details of the error, if available.
   */
  global String message;

}