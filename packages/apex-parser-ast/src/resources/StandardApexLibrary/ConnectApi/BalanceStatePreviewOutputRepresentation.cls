/**
 * The generated preview of all balances for an order or a cart, including totals, adjustments, and taxes.
 */
global class BalanceStatePreviewOutputRepresentation {

  /**
   * The grand total of the exchanges, including adjustments, fees, delivery cost, and taxes.
   */
  global Double grandTotalAmount;

  /**
   * The total amount the order was adjusted by, not including tax.
   */
  global Double totalAdjustmentAmount;

  /**
   * The total amount the order was adjusted by, including tax.
   */
  global Double totalAdjustmentAmountWithTax;

  /**
   * The total amount being return, not including tax.
   */
  global Double totalAmount;

  /**
   * The total amount being return, including tax.
   */
  global Double totalAmountWithTax;

  /**
   * The total cost for delivery, not including tax.
   */
  global Double totalDeliveryAmount;

  /**
   * The total cost for delivery, including tax.
   */
  global Double totalDeliveryAmountWithTax;

  /**
   * The combined total of all fees charged, not including tax.
   */
  global Double totalFeeAmount;

  /**
   * The combined total of all fees charged, including tax.
   */
  global Double totalFeeAmountWithTax;

  /**
   * The combined total of all taxes.
   */
  global Double totalTaxAmount;

}