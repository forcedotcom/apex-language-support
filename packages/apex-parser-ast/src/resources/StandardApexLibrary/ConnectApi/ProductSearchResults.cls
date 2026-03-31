/**
 * Product search results.
 */
global class ProductSearchResults {

  /**
   * Categories from the search results.
   */
  global ConnectApi.SearchCategory categories;

  /**
   * Reserved for future use.
   */
  global String correlationId;

  /**
   * Facets from the search results.
   */
  global List < ConnectApi.SearchFacet > facets;

  /**
   * Locale of the search results.
   */
  global String locale;

  /**
   * Page of products from the search results.
   */
  global ConnectApi.ProductSummaryPage productsPage;

}