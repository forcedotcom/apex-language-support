/**
 * ID of a ReturnOrderLineItem and instructions for updating it. After the update, the ReturnOrderLineItem is read-only. Any remaining quantity to be returned is added to a new ReturnOrderLineItem.
 */
global class ReturnOrderItemInputRepresentation {

  /**
   * The quantity of the ReturnOrderLineItem that has been received. The value must be zero or greater. This value isn’t used by any standard features, but is provided for use in customizations.
   */
  global Double quantityReceived;

  /**
   * The quantity of the ReturnOrderLineItem that has been rejected for return. The value must be zero or greater. This value isn’t used by any standard features, but is provided for use in customizations.
   */
  global Double quantityRejected;

  /**
   * The quantity of the ReturnOrderLineItem that has been returned. The value must be greater than zero. If this value plus quantityToCancel is less than the expected return quantity, then the remaining quantity to be returned is added to a new ReturnOrderLineItem.
   */
  global Double quantityReturned;

  /**
   * The quantity of the ReturnOrderLineItem to remove because it’s not being returned. The value must be zero or greater. If this value plus quantityReturned is less than the expected return quantity, then the remaining quantity to be returned is added to a new ReturnOrderLineItem.
   */
  global Double quantityToCancel;

  /**
   * The reason why the rejected quantity, if any, was rejected. This value isn’t used by any standard features, but is provided for use in customizations.
   */
  global String reasonForRejection;

  /**
   * The ID of the ReturnOrderLineItem.
   */
  global String returnOrderLineItemId;

}