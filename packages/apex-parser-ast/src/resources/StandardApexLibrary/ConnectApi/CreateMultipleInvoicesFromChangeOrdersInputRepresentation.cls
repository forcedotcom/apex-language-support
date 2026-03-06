/**
 * Data about the change orders to create Invoices for.
 */
global class CreateMultipleInvoicesFromChangeOrdersInputRepresentation {

  /**
   * List of OrderSummary IDs with the IDs of the associated change orders to create Invoices for. Each entry in the list generates one invoice, which combines the change orders in that entry.
   */
  global List < ConnectApi.CreateInvoiceFromChangeOrdersInputRepresentation > invoicesFromChangeOrders;

}