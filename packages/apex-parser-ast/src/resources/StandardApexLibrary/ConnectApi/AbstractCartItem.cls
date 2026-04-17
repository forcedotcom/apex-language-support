/**
 * A cart item.
 */
global class AbstractCartItem {

  /**
   * Reserved for future use.
   */
  global ConnectApi.BillingFrequency billingFrequency;

  /**
   * ID of the cart delivery group.
   */
  global String cartDeliveryGroupId;

  /**
   * ID of the cart.
   */
  global String cartId;

  /**
   * ID of the item.
   */
  global String cartItemId;

  /**
   * Number of child products in the cart that are associated with the item. A cart item can have child products if the productClass of the item is Bundle . For nested bundles, which include a child product that's also a bundle, childProductCount includes all child products.
   */
  global Integer childProductCount;

  /**
   * Array of sObjects and viewable custom fields for the sObjects. Standard fields are ignored. Currently, only the CartItem sObject is supported. Field-level security rules from the shopper profile are applied to the custom fields. The rules are applied for registered shoppers and for the guest shopper profile.
   */
  global List < SObject > customFields;

  /**
   * Specifies whether the shipping charge for the cart item is waived ( true ) or not ( false ). If the value is true , the cart item is classified as a digital product.
   */
  global Boolean isShippingChargeNotApplicable;

  /**
   * Messages summary for the item.
   */
  global ConnectApi.CartMessagesSummary messagesSummary;

  /**
   * Name of the item.
   */
  global String name;

  /**
   * ID of the item’s parent cart item. The value is empty if the item is a top-level cart item.
   */
  global String parentCartItemId;

  /**
   * Summary of the product details.
   */
  global ConnectApi.CartItemProduct productDetails;

  /**
   * ID of the product.
   */
  global String productId;

  /**
   * Reserved for future use.
   */
  global String productSellingModelId;

  /**
   * Promotion display name for a bonus product.
   */
  global String promotionDisplayName;

  /**
   * Quantity of the item.
   */
  global String quantity;

  /**
   * Reserved for future use.
   */
  global ConnectApi.SellingModelType sellingModelType;

  /**
   * Subtype of item in a cart. Values are: Bonus —A bonus product. Gift —A gift product.
   */
  global ConnectApi.CartItemSubType subType;

  /**
   * Reserved for future use.
   */
  global Integer subscriptionTerm;

  /**
   * Type of item in a cart. Values are: DeliveryCharge Product
   */
  global ConnectApi.CartItemType type;

}