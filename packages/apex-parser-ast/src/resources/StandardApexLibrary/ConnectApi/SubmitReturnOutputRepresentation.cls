/**
 * ID of the change order created for a return action, and a set of its financial values.
 */
global class SubmitReturnOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * Financial values resulting from the return.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * ID of the change order created for the returned order items and shipping charges. Use this change order to create a credit memo.
   */
  global String changeOrderId;

  /**
   * ID of the change order created by returning order items with associated return fees. Use this change order to create an invoice.
   */
  global String feeChangeOrderId;

}