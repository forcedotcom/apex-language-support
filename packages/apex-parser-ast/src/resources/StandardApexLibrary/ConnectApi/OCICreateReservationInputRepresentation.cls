/**
 * Data to reserve inventory at one or more Omnichannel Inventory locations or location groups.
 */
global class OCICreateReservationInputRepresentation {

  /**
   * A UUID that identifies the request. Use the action request IDs in response data to identify which requests succeeded or failed. If the OmnichannelInventoryService class's createReservation method is called, the actionRequestId is used for the reservationId.
   */
  global String actionRequestId;

  /**
   * When true, if the system can’t create the entire reservation, then it attempts to create a partial reservation.
   */
  global Boolean allowPartialReservations;

  /**
   * A list of product quantities and locations or location groups. The list can include up to 100 elements.
   */
  global List < ConnectApi.OCICreateReservationSingleInputRepresentation > createRecords;

  /**
   * A length of time in seconds. If the reservation isn’t fulfilled within this amount of time after the reservationTime , then it expires. The maximum value is 14400.
   */
  global Integer expirationSeconds;

  /**
   * External reference ID.
   */
  global String externalRefId;

  /**
   * The time at which to record the reservation. Example: 2020-07-24T21:13:00Z
   */
  global String reservationTime;

}