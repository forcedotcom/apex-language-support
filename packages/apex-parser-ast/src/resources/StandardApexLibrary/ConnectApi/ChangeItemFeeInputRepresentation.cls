/**
 * Input representation for Change Item Fee Input
 */
global class ChangeItemFeeInputRepresentation {

  /**
   * Positive value used to calculate the fee amount, as described by the amountType .
   */
  global Double amount;

  /**
   * Describes how the fee amount is calculated. Valid values are: AmountWithTax —Value of amount is the fee amount, including tax. AmountWithoutTax —Value of amount is the fee amount, not including tax. Tax is calculated on the value and added. Percentage —Value of amount is a percentage. To determine the fee amount, amount is divided by 100, and then multiplied by the TotalPrice and TotalTaxAmount of the associated OrderItemSummary, prorated for the quantity being returned. PercentageGross —Value of amount is a percentage. To determine the fee amount, amount is divided by 100, and then multiplied by the TotalLineAmountWithTax of the associated OrderItemSummary, prorated for the quantity being returned.
   */
  global String amountType;

  /**
   * Description of the fee.
   */
  global String description;

  /**
   * ID of the price book entry associated with the fee product.
   */
  global String priceBookEntryId;

  /**
   * ID of the product representing the fee.
   */
  global String product2Id;

  /**
   * Reason for the fee. The value must match an entry in the OrderProductSummaryChange object’s Reason picklist.
   */
  global String reason;

}