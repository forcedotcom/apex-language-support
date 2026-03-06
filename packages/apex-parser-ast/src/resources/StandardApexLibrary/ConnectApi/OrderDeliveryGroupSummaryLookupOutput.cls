/**
 * Order delivery group summary lookup output.
 */
global class OrderDeliveryGroupSummaryLookupOutput {

  /**
   * Three-letter ISO 4217 currency code associated with the order delivery group summary record.
   */
  global String currencyIsoCode;

  /**
   * Delivery method associated with order the delivery group summary.
   */
  global ConnectApi.OrderDeliveryMethodLookupOutput deliveryMethod;

  /**
   * Map of requested order delivery group summary fields.
   */
  global Map < String , ConnectApi.RecordField ConnectApi.RecordField > fields;

  /**
   * ID of the order delivery group summary.
   */
  global String id;

  /**
   * Line items associated with the order delivery group summary.
   */
  global List < ConnectApi.OrderSummaryLookupOutput > lineItems;

}