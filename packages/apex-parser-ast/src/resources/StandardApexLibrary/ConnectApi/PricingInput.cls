/**
 * Pricing for multiple products.
 */
global class PricingInput {

  global PricingInput() {}

  /**
   * Up to 500 line items for pricing.
   */
  global List < ConnectApi.PricingLineItemInput > pricingLineItems;

  global Object clone() {}

}