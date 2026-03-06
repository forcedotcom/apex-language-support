/**
 * A cart.
 */
global class CartInput {

  /**
   * Currency ISO code of the cart.
   */
  global String currencyIsoCode;

  /**
   * Array of sObjects and custom fields for the sObjects. Standard fields are ignored. The custom fields must already be defined for the sObject. Currently, only the WebCart sObject is supported. Field-level security rules from the shopper profile are applied to the custom fields. The rules are applied for registered shoppers and for the guest shopper profile. See Create a Cart and Cart Item with Custom Fields in a Commerce Store .
   */
  global List < SObject > customFields;

  /**
   * ID of the buyer account or guest buyer profile for which the request is made. If unspecified, the default value is determined from context.
   */
  global String effectiveAccountId;

  /**
   * Specifies whether the cart is secondary ( true ) or not ( false ). If unspecified, defaults to false .
   */
  global Boolean isSecondary;

  /**
   * Name of the cart. The name can have up to 250 Unicode characters. If unspecified, defaults to the generated name.
   */
  global String name;

  /**
   * ID of the owner of the order.
   */
  global String orderOwnerId;

  /**
   * Type of cart. Vaues are: Cart —Cart created by a customer. PayNowReadOnly —Clone of a Template cart that the customer can check out with using the Pay Now feature. Template —Cart created by an internal user. If unspecified, defaults to Cart .
   */
  global ConnectApi.CartType type;

  /**
   * Type of the cart provided as a string.
   */
  global String typeAsString;

}