/**
 * Product category.
 */
global class ProductCategoryData {

  global ProductCategoryData() {}

  /**
   * Description of the category.
   */
  global String description;

  /**
   * ID of the category.
   */
  global String id;

  /**
   * Name of the category.
   */
  global String name;

  /**
   * SEO-friendly URL slug of the category.
   */
  global String urlSlug;

  global Object clone() {}

}