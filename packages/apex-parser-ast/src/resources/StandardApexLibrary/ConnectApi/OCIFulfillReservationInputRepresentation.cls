/**
 * A list of inventory reservations to fulfill.
 */
global class OCIFulfillReservationInputRepresentation {

  /**
   * A list of inventory reservations. The list can include up to 100 elements.
   */
  global List < ConnectApi.OCIFulfillReservationSingleInputRepresentation > fulfillmentRecords;

  /**
   * The ID of the inventory reservation.
   */
  global String reservationId;

}