/**
 * Find promotions that the customer is eligible for and compute their discounts.
 */
global class PromotionEvaluateInput {

  /**
   * Cart and its items.
   */
  global ConnectApi.PromotionCartInput cart;

  /**
   * List of cart delivery groups associated with the items in the cart. Available if shipping promotions are enabled.
   */
  global List < ConnectApi.PromotionCartDeliveryGroupInput > cartDeliveryGroups;

  /**
   * Collection of coupon codes to enable promotions. A customer can apply a maximum of two coupons per cart.
   */
  global List < String > couponCodes;

  /**
   * ID of the account for which the request is made.
   */
  global String effectiveAccountId;

  /**
   * Specifies whether order-level adjustments are itemized ( true ) or not ( false ). If unspecified, the default value is false .
   */
  global Boolean isItemizeHeaderAdjustments;

  /**
   * Collection of parent product IDs mapped to their variation product IDs.
   */
  global List < ConnectApi.PromotionParentProductsInput > parentProducts;

  /**
   * Collection of product IDs mapped to their associated category IDs.
   */
  global List < ConnectApi.PromotionProductCategoriesInput > productCategories;

  /**
   * All promotions associated with promotion segments specified in this collection are active and can be evaluated against the cart. Additionally, any segments associated with a store or buyer group are also still evaluated against the cart. If this field is not present, only the promotions associated with a store or buyer group are evaluated.
   */
  global List < String > segments;

  /**
   * ID of the store for which the request is made. If unspecified, defined segments must be used instead.
   */
  global String webStoreId;

}