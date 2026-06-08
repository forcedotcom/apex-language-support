/**
 * A change to an order item adjustment line summary.
 */
global class ChangeOrderItemAdjustmentLineSummaryInputRepresentation {

  global ChangeOrderItemAdjustmentLineSummaryInputRepresentation() {}

  /**
   * Whether a new order item adjustment line summary is being created or an existing summary is being updated. Valid values are New or Update.
   */
  global String changeType;

  /**
   * The order item adjustment line summary sObject representation that contains the changes for the Order Item Adjustment Line Summary entity.
   */
  global SObject orderItemAdjustmentLineSummary;

  /**
   * The unique reference ID for this adjustment line summary. This field is valid only if the Change Type value is New.
   */
  global String referenceId;

  global Object clone() {}

}