/**
 * Data to update one Omnichannel Inventory reservation item.
 */
global class OCIUpdateReservationSingleInputRepresentation {

  /**
   * Identifier of the location group where the inventory is reserved.
   */
  global String locationGroupIdentifier;

  /**
   * Identifier of the location where the inventory is reserved.
   */
  global String locationIdentifier;

  /**
   * The quantity of the product to update.
   */
  global Double quantity;

  /**
   * The SKU of the product to update.
   */
  global String stockKeepingUnit;

}