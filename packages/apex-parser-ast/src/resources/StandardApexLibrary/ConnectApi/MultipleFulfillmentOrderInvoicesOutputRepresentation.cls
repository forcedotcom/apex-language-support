/**
 * IDs of the created Invoices.
 */
global class MultipleFulfillmentOrderInvoicesOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global MultipleFulfillmentOrderInvoicesOutputRepresentation() {}

  /**
   * List of IDs of the created Invoices.
   */
  global List < String > invoiceIds;

  global Object clone() {}

}