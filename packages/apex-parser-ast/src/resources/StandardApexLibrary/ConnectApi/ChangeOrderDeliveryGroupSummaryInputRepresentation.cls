/**
 * A change to an order delivery group summary.
 */
global class ChangeOrderDeliveryGroupSummaryInputRepresentation {

  global ChangeOrderDeliveryGroupSummaryInputRepresentation() {}

  /**
   * Whether a new order delivery group summary is being created or an existing summary is being updated. Valid values are New or Update.
   */
  global String changeType;

  /**
   * The order delivery group summary sObject representation that contains the changes for the Order Delivery Group Summary entity.
   */
  global SObject orderDeliveryGroupSummary;

  /**
   * The unique reference ID for this order delivery group summary. This field is valid only if the Change Type value is New.
   */
  global String referenceId;

  global Object clone() {}

}