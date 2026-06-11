/**
 * Base Order Management Invoice output class.
 */
global class BaseInvoiceOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global BaseInvoiceOutputRepresentation() {}

  /**
   * ID of the created invoice.
   */
  global String invoiceId;

  global Object clone() {}

}