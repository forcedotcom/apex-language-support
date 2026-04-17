/**
 * Information about tax amount values on the line item.
 */
global class TaxAmountDetailsResponse {

  /**
   * Amount of the line item exempt from tax application.
   */
  global Double exemptAmount;

  /**
   * Tax amount for the line item.
   */
  global Double taxAmount;

  /**
   * Total amount of the line item.
   */
  global Double totalAmount;

  /**
   * The line item's total amount with tax.
   */
  global Double totalAmountWithTax;

}