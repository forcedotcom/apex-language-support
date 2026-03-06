/**
 * A cart item and its adjustments.
 */
global class PromotionCartItem {

  /**
   * ID of the associated cart delivery group.
   */
  global String cartDeliveryGroupId;

  /**
   * ID of the associated cart.
   */
  global String cartId;

  /**
   * List of price adjustments applied to the cart item.
   */
  global List < ConnectApi.PromotionCartItemPriceAdjustment > cartItemPriceAdjustments;

  /**
   * ID of the cart item.
   */
  global String id;

  /**
   * Description of the cart item.
   */
  global String itemDescription;

  /**
   * Name of the cart item.
   */
  global String itemName;

  /**
   * Unit list price of the cart item.
   */
  global String listPrice;

  /**
   * ID of the product.
   */
  global String product2Id;

  /**
   * Quantity of the cart item.
   */
  global String quantity;

  /**
   * Unit sales price of the cart item.
   */
  global String salesPrice;

  /**
   * Stock keeping unit of the cart item.
   */
  global String sku;

  /**
   * Total adjustment amount for the cart item.
   */
  global String totalAdjustmentBaseAmount;

  /**
   * Total amount for the cart item, based on sales price and quantity, not including adjustments.
   */
  global String totalLineBaseAmount;

  /**
   * Total amount for the cart item, based on list price and quantity, not including adjustments.
   */
  global String totalListBaseAmount;

  /**
   * Total amount for the cart item, based on list price and quantity, including adjustments.
   */
  global String totalNetAmount;

  /**
   * Type of item in a cart. Values are: DeliveryCharge Product
   */
  global ConnectApi.CartItemType type;

}