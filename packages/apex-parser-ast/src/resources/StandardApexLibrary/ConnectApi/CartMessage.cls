/**
 * Cart message.
 */
global class CartMessage {

  /**
   * Cart message.
   */
  global String message;

  /**
   * ID of the object supplying the message.
   */
  global String messageId;

  /**
   * ID of the entity, for example, cart, cart item, or cart tax, associated with the message.
   */
  global String relatedEntityId;

  /**
   * Severity of cart message. Values are: Error Info Warning
   */
  global ConnectApi.CartMessageSeverity severity;

  /**
   * Type of message. Standard values include Inventory , Taxes , Pricing , Shipping , Entitlement , SystemError , and Other .
   */
  global String type;

  /**
   * Specifies whether the message is visible ( true ) or dismissed ( false ).
   */
  global Boolean visible;

}