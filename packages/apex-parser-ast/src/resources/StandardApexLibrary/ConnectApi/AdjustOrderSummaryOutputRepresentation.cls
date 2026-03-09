/**
 * Output representation of the financial changes for an adjust items action. For a preview action, these values are the expected output. For a submit action, these values are the actual output.
 */
global class AdjustOrderSummaryOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * Expected (for preview) or actual (for submit) financial values for the price adjustment action. Most of the values match the change order values. If two change orders are returned, then these values combine them. The sign of a value in this output is the opposite of the corresponding value on a change order record. For example, a discount is a positive value in changeBalances and a negative value on a change order record.
   */
  global ConnectApi.ChangeItemOutputRepresentation changeBalances;

  /**
   * ID of the change Order that holds the financial changes applicable to OrderItemSummary quantities that are in the process of being fulfilled. This change Order is only created for a request that specified an allocatedItemsChangeOrderType of InFulfillment. For an adjustPreview call, this value is always null.
   */
  global String inFulfillmentChangeOrderId;

  /**
   * ID of the OrderSummary.
   */
  global String orderSummaryId;

  /**
   * ID of the change Order that holds the financial changes applicable to OrderItemSummary quantities that have been fulfilled. For an adjustPreview call, this value is always null.
   */
  global String postFulfillmentChangeOrderId;

  /**
   * ID of the change Order that holds the financial changes applicable to OrderItemSummary quantities that have not been fulfilled. If the request specified an allocatedItemsChangeOrderType of PreFulfillment, this change Order also includes the changes applicable to OrderItemSummary quantities that are in the process of being fulfilled. For an adjustPreview call, this value is always null.
   */
  global String preFulfillmentChangeOrderId;

}