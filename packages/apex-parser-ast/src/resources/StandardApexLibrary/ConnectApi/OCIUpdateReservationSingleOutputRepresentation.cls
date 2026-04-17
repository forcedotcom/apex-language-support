/**
 * Details of an updated reservation for one product.
 */
global class OCIUpdateReservationSingleOutputRepresentation {

  /**
   * The total reservation adjustment.
   */
  global Double adjustment;

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
   * The total reservation quantity of the product.
   */
  global Double quantity;

  /**
   * The SKU of the updated product.
   */
  global String stockKeepingUnit;

}