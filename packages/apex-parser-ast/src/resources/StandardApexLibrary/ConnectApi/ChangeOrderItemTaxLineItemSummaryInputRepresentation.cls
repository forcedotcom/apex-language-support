/**
 * A change to an order item tax line item summary.
 */
global class ChangeOrderItemTaxLineItemSummaryInputRepresentation {

  global ChangeOrderItemTaxLineItemSummaryInputRepresentation() {}

  /**
   * Whether a new order item tax line item summary is being created or an existing summary is being updated. Valid values are New or Update.
   */
  global String changeType;

  /**
   * The order item tax line item summary sObject representation that contains the changes for the Order Item Tax Line Summary entity.
   */
  global SObject orderItemTaxLineItemSummary;

  /**
   * The unique reference ID for this order tax line item summary. This field is valid only if the Change Type value is New.
   */
  global String referenceId;

  global Object clone() {}

}