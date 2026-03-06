/**
 * Pricing result line item.
 */
global class PricingResultLineItem {

  /**
   * Error code and message.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * List price for the product.
   */
  global String listPrice;

  /**
   * Lowest unit price for the product.
   */
  global String lowestUnitPrice;

  /**
   * ID of the pricebook entry.
   */
  global String pricebookEntryId;

  /**
   * ID of the product to price.
   */
  global String productId;

  /**
   * Specifies whether the execution was successful ( true ) or not ( false ).
   */
  global Boolean success;

  /**
   * Unit price for the product.
   */
  global String unitPrice;

}