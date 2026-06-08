/**
 * An expected future inventory restock.
 */
global class OCIFutureInventoryOutputRepresentation {

  global OCIFutureInventoryOutputRepresentation() {}

  /**
   * Date when the future inventory is expected.
   */
  global Datetime expectedDate;

  /**
   * Quantity of the future inventory.
   */
  global Double quantity;

  global Object clone() {}

}