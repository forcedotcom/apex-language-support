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

  global String getDescription() {}

  global String getId() {}

  global String getName() {}

  global String getUrlName() {}

  global void setDescription(String value) {}

  global void setId(String value) {}

  global void setName(String value) {}

  global void setUrlName(String value) {}

}