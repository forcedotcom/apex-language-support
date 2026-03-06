/**
 * Details of a product category.
 */
global class ProductCategoryDetail {

  /**
   * Banner image of the product category.
   */
  global ConnectApi.ProductCategoryMedia bannerImage;

  /**
   * List of fields for the product category.
   */
  global Map < String , String > fields;

  /**
   * ID of the product category.
   */
  global String id;

  /**
   * List of media groups of the product category.
   */
  global List < ConnectApi.ProductCategoryMediaGroup > mediaGroups;

  /**
   * Tile image of the product category.
   */
  global ConnectApi.ProductCategoryMedia tileImage;

  /**
   * SEO-friendly URL name of the product category.
   */
  global String urlName;

}