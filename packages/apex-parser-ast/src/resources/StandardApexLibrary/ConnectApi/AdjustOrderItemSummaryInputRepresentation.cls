/**
 * Price adjustments to order item summaries that together make up a price adjustment to an order, with options for adjusting items in the process of being fulfilled.
 */
global class AdjustOrderItemSummaryInputRepresentation {

  /**
   * List of price adjustments to order item summaries.
   */
  global List < ConnectApi.AdjustItemInputRepresentation > adjustItems;

  /**
   * Process to use for order item summary quantities that are currently being fulfilled, defined as QuantityAllocated - QuantityFulfilled . Values are: Disallowed —When distributing the adjustment, ignore any quantities being fulfilled. If an order item summary’s entire quantity is being fulfilled, return an error. This is the default value. InFulfillment —When distributing the adjustment, include quantities being fulfilled. Create a separate change order for the adjustments made to those quantities. PreFulfillment —When distributing the adjustment, include quantities being fulfilled. Include the adjustments made to those quantities in the change order for pre-fulfillment quantity adjustments.
   */
  global String allocatedItemsChangeOrderType;

}