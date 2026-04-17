/**
 * Output representation of the product search response
 */
global class ProductSearchOutputRepresentation {

  /**
   * Three-letter ISO 4217 currency code associated with the product.
   */
  global String currencyIsoCode;

  /**
   * A list of facet names to filter the search. For example, ["size_medium", "color_red"] .
   */
  global List < ConnectApi.ProductSearchFacetOutputRepresentation > facets;

  /**
   * Locale used for the product search.
   */
  global String locale;

  /**
   * Maximum number of search results pages to return. If you don't specify a value, the default is 1.
   */
  global Integer pageNumber;

  /**
   * Number of items per page. Valid values are from 1 through 100. If you don’t specify a value, the default size is 20.
   */
  global Integer pageSize;

  /**
   * List of products found by the search.
   */
  global List < ConnectApi.ProductSearchProductOutputRepresentation > products;

  /**
   * Total products found.
   */
  global Integer totalRecordsFound;

}