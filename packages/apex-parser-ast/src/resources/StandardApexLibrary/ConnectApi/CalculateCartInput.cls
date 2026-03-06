/**
 * Custom fields for a cart calculation.
 */
global class CalculateCartInput {

  /**
   * Array of sObjects and custom fields for the sObjects. Standard fields are ignored. The custom fields must already be defined for the sObject. Currently, the WebCart, CartItem, and CartDeliveryGroup sObjects are supported. Field-level security rules from the shopper profile are applied to the custom fields. The rules are applied for registered shoppers and for the guest shopper profile. See Create a Cart and Cart Item with Custom Fields in a Commerce Store .
   */
  global List < SObject > customFields;

}