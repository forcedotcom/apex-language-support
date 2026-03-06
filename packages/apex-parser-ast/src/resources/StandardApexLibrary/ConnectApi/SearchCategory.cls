/**
 * Search category.
 */
global class SearchCategory {

  /**
   * Information about the category.
   */
  global ConnectApi.ProductCategoryData category;

  /**
   * First-level child categories of the category searched with non-empty search results.
   */
  global List < ConnectApi.SearchCategory > children;

  /**
   * Number of products in the search results that belong to the category.
   */
  global Long productCount;

}