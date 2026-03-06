/**
 * Details of one or more inventory reservations to release.
 */
global class OCIReleaseReservationInputRepresentation {

  /**
   * List of inventory reservations to release. The list can include up to 100 elements.
   */
  global List < ConnectApi.OCIReleaseReservationSingleInputRepresentation > releaseRecords;

  /**
   * The ID of the inventory reservation.
   */
  global String reservationId;

}