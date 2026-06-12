/**
 * Expected financial values for a proposed change order summary action.
 */
global class PreviewChangeOrderSummaryOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global PreviewChangeOrderSummaryOutputRepresentation() {}

  /**
   * The expected financial values for the proposed change Order Summary action.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * The ID of the OrderSummary.
   */
  global String orderSummaryId;

  global Object clone() {}

}