/**
 * An OrderDeliveryGroupSummary that defines a delivery method and recipient, and a list of fulfillment groups to assign to FulfillmentOrders. Each fulfillment group is a set of OrderItemSummaries that match the OrderDeliveryGroupSummary and share the same fulfillment location. The method creates a FulfillmentOrder for each fulfillment group and a FulfillmentOrderLineItem for each OrderItemSummary.
 */
global class FulfillmentOrderInputRepresentation {

  /**
   * Default activation status for a new fulfillment order. If you don't specify a value, the default value is Allocated , which belongs to the Activated status category. This default can be changed, but the replacement status must also have a status category of Activated .
   */
  global String defaultActivationStatus;

  /**
   * List of fulfillment groups that specify the OrderItemSummaries and fulfillment locations.
   */
  global List < ConnectApi.FulfillmentGroupInputRepresentation > fulfillmentGroups;

  /**
   * ID of the OrderDeliveryGroupSummary.
   */
  global String orderDeliveryGroupSummaryId;

  /**
   * ID of the OrderSummary.
   */
  global String orderSummaryId;

}