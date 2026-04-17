/**
 * ID of a credit memo to ensure refunds for, an amount of excess funds to refund, or both. At least one is required. Also includes any invoices for fees that reduce the refund amount, such as return fees. If multiple payment methods are available, you can specify how to distribute the refund.
 */
global class EnsureRefundsAsyncInputRepresentation {

  /**
   * ID of the credit memo that represents a refund amount.
   */
  global String creditMemoId;

  /**
   * Amount of excess funds to refund.
   */
  global Double excessFundsAmount;

  /**
   * List of invoices for any fees that reduce the refund, such as return fees.
   */
  global List < ConnectApi.InvoiceToPayInputRepresentation > invoicesToPay;

  /**
   * This value controls the behavior when the amounts included in the sequences list don’t cover the entire refund amount. If this value is false, then the default refund logic is applied to ensure the remaining refund amount. If this value is true, then the unrefunded balance remains on the credit memo. If you don’t specify a sequences list, this value is ignored and the default refund logic is applied. The default value is false.
   */
  global Boolean isAllowPartial;

  /**
   * If true, the refundable amount is used to open the payment balance for the reservedBalanceAmount in the Order Payment Summaries. The remaining refundable amount considers the sequence of order payment summaries, if provided. If false, any reserved balance amount for exchanges is refunded.
   */
  global Boolean isReservedBalanceAmountConsidered;

  /**
   * Ordered list of refund amounts and OrderPaymentSummaries to apply them to. An OrderPaymentSummary must either belong to the order summary or be a reference to the order summary in the OrderPaymentSummaryReference entity. The process traverses this list in order and stops when it's refunded the full amount.
   */
  global List < ConnectApi.SequenceOrderPaymentSummaryInputRepresentation > sequences;

}