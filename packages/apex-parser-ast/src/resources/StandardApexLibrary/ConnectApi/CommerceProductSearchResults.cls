/**
 * Product search results information.
 */
global class CommerceProductSearchResults {

  global CommerceProductSearchResults() {}

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

  global Object clone() {}

  global ConnectApi.SearchCategory getCategories() {}

  global String getCorrelationId() {}

  global List<ConnectApi.SearchFacet> getFacets() {}

  global String getLocale() {}

  global ConnectApi.CommerceProductSummaryPage getProductsPage() {}

  global void setCategories(ConnectApi.SearchCategory value) {}

  global void setCorrelationId(String value) {}

  global void setFacets(List<ConnectApi.SearchFacet> value) {}

  global void setLocale(String value) {}

  global void setProductsPage(ConnectApi.CommerceProductSummaryPage value) {}

}