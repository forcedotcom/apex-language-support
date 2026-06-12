/**
 * Order delivery method lookup output.
 */
global class OrderDeliveryMethodLookupOutput {

  global OrderDeliveryMethodLookupOutput() {}

  /**
   * Map of requested order delivery method fields.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * ID of the order delivery method.
   */
  global String id;

  global Object clone() {}

}