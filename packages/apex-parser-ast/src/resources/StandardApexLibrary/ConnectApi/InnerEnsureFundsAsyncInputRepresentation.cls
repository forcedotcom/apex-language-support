/**
 * ID of an Invoice and ID of the associated OrderSummary.
 */
global class InnerEnsureFundsAsyncInputRepresentation {

  /**
   * ID of the Invoice to ensure funds for.
   */
  global String invoiceId;

  /**
   * If true, the invoice can be funded through multiple, partial payments. Optionally, define a sequence to capture multiple payments. If false, the invoice must be funded through a single payment. Default value is false.
   */
  global Boolean isAllowPartial;

  /**
   * If true, the reserved balance amount is used for the Order Summary to fund the invoice. If not enough reserved balance amount, any available balance that isn’t reserved by another Order Summary is used. If false, any available balance is used.
   */
  global Boolean isConsiderReservedBalanceAmount;

  /**
   * ID of the OrderSummary associated with the Invoice.
   */
  global String orderSummaryId;

  /**
   * The payment sequence in which the funds are captured for the invoice.
   */
  global String sequences;

}