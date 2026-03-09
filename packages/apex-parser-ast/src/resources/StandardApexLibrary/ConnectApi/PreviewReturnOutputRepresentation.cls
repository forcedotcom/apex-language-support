/**
 * Expected financial values for a proposed return action.
 */
global class PreviewReturnOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * Expected financial values for the proposed return action.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * ID of the OrderSummary.
   */
  global String orderSummaryId;

}