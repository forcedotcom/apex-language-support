/**
 * A list of inventory reservation transfers and specifies whether a single failure cancels the entire list.
 */
global class OCITransferReservationInputRepresentation {

  /**
   * Controls whether a single failed transfer cancels all other transfers in the transferRecords list. To allow some transfers in the transferRecords list to succeed when others fail, don’t include this property. To cancel all the transfers in the transferRecords list when any of them fail, set this property to a UUID. The ID must be unique, but isn’t otherwise used in this version.
   */
  global String allOrNothingTransferId;

  /**
   * The ID of the inventory reservation.
   */
  global String reservationId;

  /**
   * A list of inventory reservation transfers. The list can include up to 100 elements.
   */
  global List < ConnectApi.OCITransferReservationSingleInputRepresentation > transferRecords;

}