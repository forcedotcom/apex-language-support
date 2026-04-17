/**
 * Inventory availability data for a product.
 */
global class OCIInventoryRecordOutputRepresentation {

  /**
   * The Available To Fulfill quantity.
   */
  global Double availableToFulfill;

  /**
   * The Available To Order quantity.
   */
  global Double availableToOrder;

  /**
   * The effective date of the inventory. Indicates if the SKU exists in the inventory.
   */
  global Datetime effectiveDate;

  /**
   * Indicates if the SKU exists in the inventory.
   */
  global Boolean exists;

  /**
   * A list of any expected future inventory restocks.
   */
  global List < ConnectApi.OCIFutureInventoryOutputRepresentation > futures;

  /**
   * The On Hand quantity.
   */
  global Double onHand;

  /**
   * The Reserved quantity.
   */
  global Double reserved;

  /**
   * The Safety Stock Count.
   */
  global Double safetyStockCount;

  /**
   * The SKU of the product.
   */
  global String stockKeepingUnit;

}