/**
 * Response to a request to fulfill one inventory reservation.
 */
global class OCITransferReservationErrorOutputRepresentation {

  /**
   * Details of the transferred reservation, if successful.
   */
  global ConnectApi.OCITransferReservationSingleOutputRepresentation details;

  /**
   * Error code, if any.
   */
  global String errorCode;

  /**
   * Details of the error, if available.
   */
  global String message;

}