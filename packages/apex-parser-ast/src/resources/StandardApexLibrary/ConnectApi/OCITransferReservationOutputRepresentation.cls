/**
 * Response to a request to transfer one or more inventory reservations.
 */
global class OCITransferReservationOutputRepresentation {

  /**
   * Responses for the individual reservations in the transfer request.
   */
  global List < ConnectApi.OCITransferReservationErrorOutputRepresentation > errors;

  /**
   * Indicates whether the request was successful.
   */
  global Boolean success;

}