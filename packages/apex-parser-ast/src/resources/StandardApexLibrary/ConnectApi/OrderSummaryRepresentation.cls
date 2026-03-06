/**
 * Order summary.
 */
global class OrderSummaryRepresentation {

  /**
   * Adjustment aggregates associated with the order summary.
   */
  global ConnectApi.OrderSummaryAdjustmentAggregates adjustmentAggregates;

  /**
   * Created date of the order summary.
   */
  global Datetime createdDate;

  /**
   * Map of requested order summary fields.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * Order number of the order summary.
   */
  global String orderNumber;

  /**
   * ID of the order summary.
   */
  global String orderSummaryId;

  /**
   * Ordered date of the order summary.
   */
  global Datetime orderedDate;

  /**
   * ID of the owner of the order summary.
   */
  global String ownerId;

  /**
   * Status of the order summary.
   */
  global String status;

  /**
   * Total amount of the order summary.
   */
  global String totalAmount;

}