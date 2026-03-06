/**
 * Exhange order summary resulting from a submit cart to exchange order action.
 */
global class SubmitCartToExchangeOrderOutputRepresentation {

  /**
   * The balance state preview for the exchange web cart.
   */
  global ConnectApi.BalanceStatePreviewOutput balanceStateExchangeWebCart;

  /**
   * The balance state preview for the original order summary.
   */
  global ConnectApi.BalanceStatePreviewOutput balanceStateOriginalOrderSummary;

  /**
   * The balance state preview for the return order.
   */
  global ConnectApi.BalanceStatePreviewOutput balanceStateReturnOrder;

  /**
   * Change order financial values for a preview order action.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * Exchange order summary ID.
   */
  global String exchangeOrderSummaryId;

  /**
   * ID of the order summary.
   */
  global String orderSummaryId;

  /**
   * Indicates whether the transaction was successful.
   */
  global Boolean success;

}