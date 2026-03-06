/**
 * Line item price for the product.
 */
global class ProductPriceEntry {

  /**
   * Error code and error message.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * List price for the product entry.
   */
  global String listPrice;

  /**
   * Price adjustment schedule.
   */
  global ConnectApi.PriceAdjustmentSchedule priceAdjustment;

  /**
   * ID of the pricebook entry.
   */
  global String pricebookEntryId;

  /**
   * ID of the product selling model. If no product selling model ID is specified in a request parameter, this property is empty.
   */
  global String productSellingModelId;

  /**
   * Specifies whether execution was successful ( true ) or not ( false ).
   */
  global Boolean success;

  /**
   * Unit price for the product entry.
   */
  global String unitPrice;

}