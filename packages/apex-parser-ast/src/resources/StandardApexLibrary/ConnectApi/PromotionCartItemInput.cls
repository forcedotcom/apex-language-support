/**
 * Item in a cart during promotion evaluation.
 */
global class PromotionCartItemInput {

  /**
   * ID of the cart delivery group.
   */
  global String cartDeliveryGroupId;

  /**
   * ID of the cart.
   */
  global String cartId;

  /**
   * ID of the cart item. Must be unique across all items in the cart.
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
   * List price of the cart item.
   */
  global String listPrice;

  /**
   * Product ID of the cart item.
   */
  global String product2Id;

  /**
   * Number of items in the cart.
   */
  global String quantity;

  /**
   * Sales price of the cart item. This is the price per quantity and the value used to compute the discount. If salesPrice and totalLineBaseAmount are specified, totalLineBaseAmount is used.
   */
  global String salesPrice;

  /**
   * Stock keeping unit (SKU) of the cart item.
   */
  global String sku;

  /**
   * Subtype of item in a cart.Possible values are: Bonus —A bonus product. Gift —A gift product.
   */
  global ConnectApi.CartItemSubType subType;

  /**
   * Total amount for the cart item, equal to sales price multiplied by quantity. This value is used to compute the discount. If salesPrice and totalLineBaseAmount are specified, totalLineBaseAmount is used.
   */
  global String totalLineBaseAmount;

  /**
   * Total amount for the cart item based on list price and quantity.
   */
  global String totalListBaseAmount;

  /**
   * Type of item in a cart. Values are: DeliveryCharge Product
   */
  global ConnectApi.CartItemType type;

}