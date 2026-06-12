/**
 * Expected financial values for a proposed cancel action.
 */
global class PreviewCancelOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global PreviewCancelOutputRepresentation() {}

  /**
   * Expected financial values for the proposed cancel action.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * ID of the OrderSummary.
   */
  global String orderSummaryId;

  global Object clone() {}

}