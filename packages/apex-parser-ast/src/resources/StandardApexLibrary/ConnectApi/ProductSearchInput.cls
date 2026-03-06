/**
 * Product search.
 */
global class ProductSearchInput {

  /**
   * Category ID returns results for products in this category or its subcategories. If you omit categoryId from the request, all categories are searched. If you specify categoryId and searchTerm , only products in the specified category are searched.
   */
  global String categoryId;

  /**
   * Product fields to return in search results. Search results include fields you have access to. If unspecified, returns the Name , Description , StockKeepingUnit , ProductCode , and Family fields.
   */
  global List < String > fields;

  /**
   * Specifies whether to group products in search results and how to group them. If unspecified, the default is the value specified in Search | Results Display Settings | Results Grouping .
   */
  global ConnectApi.ProductSearchGroupingInput grouping;

  /**
   * Specifies whether to include prices for products in search results ( true ) or not ( false ). If unspecified, defaults to false .
   */
  global Boolean includePrices;

  /**
   * Specifies whether to include purchase quantity rule information for products in search results ( true ) or not ( false ). If unspecified, defaults to false .
   */
  global Boolean includeQuantityRule;

  /**
   * Number of the page you want returned. Starts at 0. If you pass in null or 0, the first page is returned.
   */
  global Integer page;

  /**
   * Specifies the number of items per page. Valid values are from 1 through 200. If unspecified, the default is the value specified in Results per Page in Search | Results Display Settings .
   */
  global Integer pageSize;

  /**
   * List up to nine refinements (facets) for search results. Buyers or shoppers can select up to 20 values for each refinement.
   */
  global List < ConnectApi.RefinementInput > refinements;

  /**
   * List of up to 32 space-separated search terms.
   */
  global String searchTerm;

  /**
   * ID of the sort rule that specifies the order of products in the search results.
   */
  global String sortRuleId;

}