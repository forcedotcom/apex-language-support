/**
 * After a change order is created for a ReturnOrderLineItem, that ReturnOrderLineItem is read-only. If the Return Items API is used to return a partial quantity, it creates a new “split” ReturnOrderLineItem to hold the remaining quantity to be returned. In that case, it returns this output property, which contains the IDs of the original and split ReturnOrderLineItems.
 */
global class ReturnOrderItemSplitLineOutputRepresentation {

}