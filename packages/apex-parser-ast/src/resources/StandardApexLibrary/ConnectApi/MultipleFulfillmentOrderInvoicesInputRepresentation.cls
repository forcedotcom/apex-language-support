/**
 * The FulfillmentOrders to create Invoices for.
 */
global class MultipleFulfillmentOrderInvoicesInputRepresentation {

  global MultipleFulfillmentOrderInvoicesInputRepresentation() {}

  /**
   * List of IDs of FulfillmentOrders to create Invoices for.
   */
  global List < String > fulfillmentOrderIds;

  global Object clone() {}

}