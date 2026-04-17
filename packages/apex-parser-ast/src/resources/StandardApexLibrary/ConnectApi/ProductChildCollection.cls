/**
 * Collection of child products related to a parent product.
 */
global class ProductChildCollection {

  /**
   * Number of child products returned on this page.
   */
  global Integer count;

  /**
   * Current page token, if any.
   */
  global String currentPageToken;

  /**
   * URL of the current page in the response.
   */
  global String currentPageUrl;

  /**
   * List of child products related to the parent product. The child products are sorted by their configured sequence values, in ascending order, with null values sorted last. If there are no configured sequence values, the child products are sorted by createdDate , in ascending order.
   */
  global List < ConnectApi.ProductChild > items;

  /**
   * Token for the next page, if any. A value is included in the response only if a value is returned for nextPageUrl .
   */
  global String nextPageToken;

  /**
   * URL of the next page, if any.
   */
  global String nextPageUrl;

  /**
   * Token for the previous page, if any. A value is included in the response only if a value is returned for previousPageUrl .
   */
  global String previousPageToken;

  /**
   * URL of the previous page, if any.
   */
  global String previousPageUrl;

  /**
   * Class of product. Values are: Bundle Set Simple Variation VariationParent
   */
  global ConnectApi.ProductClass productClass;

  /**
   * Total number of child products in the collection.
   */
  global Integer total;

}