/**
 * IDs of a product and associated category.
 */
global class PromotionProductCategoriesInput {

  global PromotionProductCategoriesInput() {}

  /**
   * ID of the category.
   */
  global String categoryId;

  /**
   * ID of the product.
   */
  global String productId;

  global Object clone() {}

}