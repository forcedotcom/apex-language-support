/**
 * Response to a request to release one inventory reservation.
 */
global class OCIReleaseReservationErrorOutputRepresentation {

  /**
   * Details of the released reservation, if successful.
   */
  global ConnectApi.OCIReleaseReservationSingleOutputRepresentation details;

  /**
   * Error code, if any.
   */
  global String errorCode;

  /**
   * Details of the error, if available.
   */
  global String message;

}