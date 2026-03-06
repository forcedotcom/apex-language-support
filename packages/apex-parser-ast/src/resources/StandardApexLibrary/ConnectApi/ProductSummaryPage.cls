/**
 * Page of product summaries.
 */
global class ProductSummaryPage {

  /**
   * Three-letter ISO 4217 currency code associated with the product.
   */
  global String currencyIsoCode;

  /**
   * Number of products per page in the search results.
   */
  global Integer pageSize;

  /**
   * Collection of product summaries.
   */
  global List < ConnectApi.ProductSummary > products;

  /**
   * Total number of products in the search results.
   */
  global Long total;

}