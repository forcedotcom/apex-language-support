/**
 * Details of an inventory reservation for one product.
 */
global class OCICreateReservationSingleOutputRepresentation {

  /**
   * The error code, if any.
   */
  global String errorCode;

  /**
   * Identifier of the location group where the inventory is reserved.
   */
  global String locationGroupIdentifier;

  /**
   * Identifier of the location where the inventory is reserved.
   */
  global String locationIdentifier;

  /**
   * The reserved quantity of the product.
   */
  global Double quantity;

  /**
   * The SKU of the reserved product.
   */
  global String stockKeepingUnit;

}