/**
 * ID of the change order created for a cancel action, and a set of its financial values.
 */
global class SubmitCancelOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * Financial values resulting from the cancel.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * ID of the change order created for the canceled order items and shipping charges. Use this change order to create a credit memo.
   */
  global String changeOrderId;

  /**
   * ID of the change order created by canceling order items with associated cancel fees. Use this change order to create an invoice.
   */
  global String feeChangeOrderId;

}