/**
 * Order summary lookup output.
 */
global class OrderSummaryLookupOutput {

  /**
   * Adjustment aggregates associated with the order summary.
   */
  global ConnectApi.OrderSummaryAdjustmentAggregates adjustmentAggregates;

  /**
   * Three-letter ISO 4217 currency code associated with the order summary.
   */
  global String currencyIsoCode;

  /**
   * Delivery groups associated with the order summary.
   */
  global List < ConnectApi.OrderDeliveryGroupSummaryLookupOutput > deliveryGroups;

  /**
   * Map of requested order summary fields.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * ID of the order summary.
   */
  global String id;

  /**
   * Reference number of the order summary.
   */
  global String orderNumber;

  /**
   * Status associated with the order summary.
   */
  global String status;

}