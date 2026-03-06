/**
 * An inventory reservation transfer.
 */
global class OCITransferReservationSingleInputRepresentation {

  /**
   * A UUID that identifies the request. Use the action request IDs in response data to identify which requests succeeded or failed.
   */
  global String actionRequestId;

  /**
   * The external reference ID of the location receiving the transfer.
   */
  global String externalRefId;

  /**
   * The identifier of the location group sending the reservation.
   */
  global String fromLocationGroupIdentifier;

  /**
   * The identifier of the location sending the reservation.
   */
  global String fromLocationIdentifier;

  /**
   * If true, force the transfer even if the receiving location doesn’t have sufficient available inventory. The default value is false.
   */
  global Boolean ignoreAvailabilityCheck;

  /**
   * The quantity of inventory being transferred.
   */
  global Double quantity;

  /**
   * The ID of the inventory reservation.
   */
  global String reservationId;

  /**
   * The SKU of the product being transferred.
   */
  global String stockKeepingUnit;

  /**
   * The identifier of the location group receiving the reservation.
   */
  global String toLocationGroupIdentifier;

  /**
   * The identifier of the location receiving the reservation.
   */
  global String toLocationIdentifier;

}