/**
 * A quantity of a product and an Omnichannel Inventory location or location group at which to reserve it.
 */
global class OCICreateReservationSingleInputRepresentation {

  /**
   * Identifier of the location group at which to reserve inventory.
   */
  global String locationGroupIdentifier;

  /**
   * Identifier of the location at which to reserve inventory.
   */
  global String locationIdentifier;

  /**
   * The quantity of the product to reserve.
   */
  global Double quantity;

  /**
   * The SKU of the product to reserve.
   */
  global String stockKeepingUnit;

}