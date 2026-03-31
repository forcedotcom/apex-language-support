/**
 * Pricing information for a product.
 */
global class ProductPrice {

  /**
   * Three-letter ISO 4217 currency code associated with the product. Products are priced using the currency for the buyer account or guest buyer profile. If your store doesn’t support the currency for the buyer account or guest buyer profile, products are priced using the default currency for your store.
   */
  global String currencyIsoCode;

  /**
   * List price for the product.
   */
  global String listPrice;

  /**
   * Lowest unit price for the product.
   */
  global String lowestUnitPrice;

  /**
   * Price adjustment schedule for the product. If a product selling model ID is specified in a request parameter, this property is empty.
   */
  global ConnectApi.PriceAdjustmentSchedule priceAdjustment;

  /**
   * ID of the price book entry. If a product selling model ID is specified in a request parameter, this property is empty.
   */
  global String pricebookEntryId;

  /**
   * List of line item prices for the product.
   */
  global List < ConnectApi.ProductPriceEntry > productPriceEntries;

  /**
   * Unit price for the product. If a product selling model ID is specified in a request parameter, this property is empty.
   */
  global String unitPrice;

}