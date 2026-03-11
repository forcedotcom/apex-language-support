/**
 * The quantity for a specific item
 */
global class ItemQuantityOutputRepresentation {

  /**
   * The identifier for the item with quantity
   */
  global String externalItemId;

  /**
   * Quantity requested for the item
   */
  global Double quantity;

  /**
   * Quantity that was distributed to this item
   */
  global Double quantityDistributed;

}