/**
 * A change to an order item summary.
 */
global class ChangeOrderItemSummaryInputRepresentation {

  global ChangeOrderItemSummaryInputRepresentation() {}

  /**
   * Whether a new order item summary is being created or an existing summary is being updated. Valid values are New or Update.
   */
  global String changeType;

  /**
   * The order item summary sObject representation that contains the changes for the Order Item Summary entity.
   */
  global SObject orderItemSummary;

  /**
   * The unique reference ID for this order item summary. This field is valid only if the Change Type value is New.
   */
  global String referenceId;

  global Object clone() {}

}