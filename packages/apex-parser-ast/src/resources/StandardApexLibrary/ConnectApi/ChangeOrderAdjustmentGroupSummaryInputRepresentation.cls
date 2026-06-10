/**
 * A change to an order adjustment group summary.
 */
global class ChangeOrderAdjustmentGroupSummaryInputRepresentation {

  global ChangeOrderAdjustmentGroupSummaryInputRepresentation() {}

  /**
   * Whether a new order adjustment group summary is being created or an existing summary is being updated. Valid values are New or Update.
   */
  global String changeType;

  /**
   * The order adjustment group summary sObject representation that contains the changes for the Order Adjustment Group Summary entity.
   */
  global SObject orderAdjustmentGroupSummary;

  /**
   * The unique reference ID for this order adjustment group summary. This field is valid only if the Change Type value is New.
   */
  global String referenceId;

  global Object clone() {}

}