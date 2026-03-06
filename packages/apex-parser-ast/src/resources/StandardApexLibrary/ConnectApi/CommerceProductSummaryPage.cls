/**
 * Collection of product summary representations in product search results.
 */
global class CommerceProductSummaryPage {

  /**
   * Number of products per page in search results.
   */
  global Integer pageSize;

  /**
   * Collection of product summaries.
   */
  global List < ConnectApi.CommerceProductSummary > products;

  /**
   * Number of products in search results across all pages.
   */
  global Long total;

}