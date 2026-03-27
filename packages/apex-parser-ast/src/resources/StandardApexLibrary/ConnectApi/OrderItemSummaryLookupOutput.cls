/**
 * Order item summary lookup output.
 */
global class OrderItemSummaryLookupOutput {

  /**
   * Adjustment aggregates for the order item summary.
   */
  global ConnectApi.OrderItemSummaryAdjustmentAggregates adjustmentAggregates;

  /**
   * Adjustments associated with the order item summary.
   */
  global List < ConnectApi.OrderSummaryAdjustment > adjustments;

  /**
   * Three-letter ISO 4217 currency code associated with the order item summary record.
   */
  global String currencyIsoCode;

  /**
   * Map of requested order item summary fields.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * ID of the order item summary.
   */
  global String id;

  /**
   * Details of the product associated with order item summary.
   */
  global ConnectApi.OrderSummaryProductLookupOutput product;

}