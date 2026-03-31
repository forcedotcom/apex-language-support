/**
 * Cart messages summary.
 */
global class CartMessagesSummary {

  /**
   * In ConnectApi.CartItemResult , the count of messages with the Error severity level.
   */
  global Integer errorCount;

  /**
   * Specifies whether there are messages related to the entity ( true ) or not ( false ).
   */
  global Boolean hasErrors;

  /**
   * In ConnectApi.CartItemResult , a limited list of messages related to the cart item. In ConnectApi.CartSummary , each message can be related to the cart or to another cart-related entity.
   */
  global List < ConnectApi.CartMessage > limitedMessages;

  /**
   * In ConnectApi.CartItemResult , the ID of the related cart item. In ConnectApi.CartSummary , each message can be related to the cart or to another cart-related entity.
   */
  global String relatedEntityId;

  /**
   * In ConnectApi.CartItemResult , either null if the cart item has no errors or 1 if the cart item has errors. In ConnectApi.CartSummary , the total number of product line items that contain errors.
   */
  global Integer totalLineItemsWithErrors;

}