/**
 * The available quantity of a product at an inventory location.
 */
global class LocationAvailabilityInputRepresentation {

  /**
   * The external reference ID of the inventory location.
   */
  global String externalReferenceId;

  /**
   * The available quantity of the product.
   */
  global Double quantity;

  /**
   * The Stock Keeping Unit of the product.
   */
  global String stockKeepingUnit;

}