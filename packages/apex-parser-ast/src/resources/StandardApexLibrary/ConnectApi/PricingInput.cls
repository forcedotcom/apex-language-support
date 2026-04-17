/**
 * Pricing for multiple products.
 */
global class PricingInput {

  /**
   * Up to 500 line items for pricing.
   */
  global List < ConnectApi.PricingLineItemInput > pricingLineItems;

}