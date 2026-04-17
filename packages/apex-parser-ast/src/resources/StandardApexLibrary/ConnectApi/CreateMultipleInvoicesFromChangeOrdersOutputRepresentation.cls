/**
 * List of lists of invoices created from change orders for fees.
 */
global class CreateMultipleInvoicesFromChangeOrdersOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * List of IDs of invoices created from change orders for fees. Include these invoice IDs when calling Ensure Refunds for the return that the fees applied to.
   */
  global List < ConnectApi.ChangeOrdersInvoiceOutputRepresentation > invoices;

}