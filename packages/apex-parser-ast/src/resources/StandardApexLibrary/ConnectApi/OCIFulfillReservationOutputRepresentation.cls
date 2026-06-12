/**
 * Response to a request to fulfill one or more inventory reservations.
 */
global class OCIFulfillReservationOutputRepresentation {

  global OCIFulfillReservationOutputRepresentation() {}

  /**
   * Responses for the individual reservations in the fulfillment request.
   */
  global List < ConnectApi.OCIFulfillReservationErrorOutputRepresentation > errors;

  /**
   * Indicates whether the request was successful.
   */
  global Boolean success;

  global Object clone() {}

}