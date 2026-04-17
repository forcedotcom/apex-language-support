/**
 * Product pricing result.
 */
global class PricingResult {

  /**
   * Three-letter ISO 4217 currency code associated with the product.
   */
  global String currencyIsoCode;

  /**
   * Error code and message.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Pricing result line Items.
   */
  global List < ConnectApi.PricingResultLineItem > pricingLineItemResults;

  /**
   * Specifies whether the execution was successful ( true ) or not ( false ).
   */
  global Boolean success;

}