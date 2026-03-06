/**
 * An item in a cart.
 */
global class CartItemInput {

  /**
   * ID of the cart delivery group.
   */
  global String cartDeliveryGroupId;

  /**
   * Array of sObjects and custom fields for the sObjects. Standard fields are ignored. The custom fields must already be defined for the sObject. Currently, only the CartItem sObject is supported. Field-level security rules from the shopper profile are applied to the custom fields. The rules are applied for registered shoppers and for the guest shopper profile. The custom fields can be of type Checkbox, Currency, Date, Email, LongTextArea, Number, Percent, Phone, Text, TextArea, Url, Address, or Location. The customFields property isn't supported in stores built on an Aura template. See Create a Cart and Cart Item with Custom Fields in a Commerce Store .
   */
  global List < SObject > customFields;

  /**
   * ID of the product.
   */
  global String productId;

  /**
   * The ID of the product selling model associated with Product2.
   */
  global String productSellingModelId;

  /**
   * Quantity of the cart item. Use a value that can be converted to BigDecimal.
   */
  global String quantity;

  /**
   * The total number of terms in the subscription period.
   */
  global Integer subscriptionTerm;

  /**
   * Subtype of item in a cart.Possible values are: Bonus —A bonus product. Gift —A gift product.
   */
  global ConnectApi.CartItemSubType subType;

  /**
   * Type of item in a cart. Value is Product . DeliveryCharge Product
   */
  global ConnectApi.CartItemType type;

}