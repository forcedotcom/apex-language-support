/**
 * Search category.
 */
global class SearchCategory {

  global SearchCategory() {}

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

  global Object clone() {}

  global ConnectApi.ProductCategoryData getCategory() {}

  global List<ConnectApi.SearchCategory> getChildren() {}

  global Long getProductCount() {}

  global void setCategory(ConnectApi.ProductCategoryData value) {}

  global void setChildren(List<ConnectApi.SearchCategory> value) {}

  global void setProductCount(Long value) {}

}