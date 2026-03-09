/**
 * Expected financial values for a proposed cancel action.
 */
global class PreviewCancelOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * Expected financial values for the proposed cancel action.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * ID of the OrderSummary.
   */
  global String orderSummaryId;

}