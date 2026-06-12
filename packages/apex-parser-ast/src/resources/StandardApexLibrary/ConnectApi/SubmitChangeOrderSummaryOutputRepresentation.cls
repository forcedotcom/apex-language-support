/**
 * ID of the change order created for a submit change order summary action, and a set of its financial values.
 */
global class SubmitChangeOrderSummaryOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global SubmitChangeOrderSummaryOutputRepresentation() {}

  /**
   * The financial values for the change Order Summary action.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * The ID of the OrderSummary.
   */
  global String orderSummaryId;

  /**
   * The pre fulfillment change order ID that holds the financial changes applicable to the modified order. When the change is non-financial, this value is always null. Use this change order to create a credit memo.
   */
  global String preFulfillmentChangeOrderId;

  global Object clone() {}

}