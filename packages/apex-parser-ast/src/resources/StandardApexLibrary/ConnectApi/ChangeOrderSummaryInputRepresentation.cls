/**
 * A change to an order summary. There are several general validations for this input. The maximum number of changes allowed per request is 100. You must include at least one change for an entity, and each change that's associated with an entity counts as one change. You can modify only order item summaries in Ordered status.
 */
global class ChangeOrderSummaryInputRepresentation {

  global ChangeOrderSummaryInputRepresentation() {}

  /**
   * The order reference number value for the Change Order associated with the current request.
   */
  global String changeOrdersReferenceNumber;

  /**
   * The reason for the change. It has to be an active Picklist value from the OrderItemSummaryChange entity Reason field.
   */
  global String changeReason;

  /**
   * The list of order adjustment group summaries changes.
   */
  global List < ChangeOrderAdjustmentGroupSummaryInputRepresentation > orderAdjustmentGroupSummaries;

  /**
   * The list of order delivery group summaries changes.
   */
  global List < ChangeOrderDeliveryGroupSummaryInputRepresentation > orderDeliveryGroupSummaries;

  /**
   * The list of order item adjustment line summaries changes.
   */
  global List < ChangeOrderItemAdjustmentLineSummaryInputRepresentation > orderItemAdjustmentLineSummaries;

  /**
   * The list of order item summaries changes.
   */
  global List < ChangeOrderItemSummaryInputRepresentation > orderItemSummaries;

  /**
   * The list of order item tax line item summaries changes.
   */
  global List < ChangeOrderItemTaxLineItemSummaryInputRepresentation > orderItemTaxLineItemSummaries;

  /**
   * The order summary sObject representation that contains the changes for the Order Summary.
   */
  global SObject orderSummary;

  global Object clone() {}

}