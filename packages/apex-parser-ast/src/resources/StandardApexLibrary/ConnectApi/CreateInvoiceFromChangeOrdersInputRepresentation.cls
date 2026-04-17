/**
 * OrderSummary and associated change orders to create Invoices for.
 */
global class CreateInvoiceFromChangeOrdersInputRepresentation {

  /**
   * List of IDs of change orders to create Invoices for.
   */
  global List < String > changeOrderIds;

  /**
   * ID of the associated Order Summary.
   */
  global String orderSummaryId;

}