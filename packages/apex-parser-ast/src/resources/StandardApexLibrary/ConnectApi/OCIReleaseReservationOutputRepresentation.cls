/**
 * Response to a request to release one or more inventory reservations.
 */
global class OCIReleaseReservationOutputRepresentation {

  global OCIReleaseReservationOutputRepresentation() {}

  /**
   * Responses for the individual reservations in the release request.
   */
  global List < ConnectApi.OCIReleaseReservationErrorOutputRepresentation > errors;

  /**
   * Indicates whether the request was successful.
   */
  global Boolean success;

  global Object clone() {}

}