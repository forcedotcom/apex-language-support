/**
 * Data to update one or more Omnichannel Inventory item reservations.
 */
global class OCIUpdateReservationInputRepresentation {

  /**
   * Unique and idempotent action request ID. Use in response data to identify which requests succeeded or failed.
   */
  global String actionRequestId;

  /**
   * When true, if the system can’t update the entire reservation, then it attempts to update a partial reservation.
   */
  global Boolean allowPartialReservations;

  /**
   * External reference ID.
   */
  global String externalRefId;

  /**
   * The ID of the inventory reservation.
   */
  global String reservationId;

  /**
   * The time the reservation was updated. Example: 2020-07-24T21:13:00Z.
   */
  global String reservationTime;

  /**
   * Controls whether a single failed request updates all other requests in the list (true) or whether some requests can succeed if others fail (false). The default value is false.
   */
  global List updateAllOrNothingRecords;

  /**
   * A list of product quantities and locations or location groups. The list can have up to 100 elements.
   */
  global List ConnectApi.OCIUpdateReservationSingleInputRepresentation [] updateRecords;

}