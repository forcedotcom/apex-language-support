/**
 * Data for creating a ReturnOrderLineItem that represents a return fee.
 */
global class ReturnOrderLineItemFeeInputRepresentation {

  /**
   * Value used to calculate the fee amount, as described by the amountType . It must be a positive value.
   */
  global Double amount;

  /**
   * Describes how the fee amount is calculated. It can have one of these values: AmountTaxOnly —Value of amount is the tax-only adjustment only. Available in version 65.0 and later. AmountWithTax —Value of amount is the fee amount, including tax. AmountWithoutTax —Value of amount is the fee amount, not including tax. Tax is calculated on the value and added. Percentage —Value of amount is a percentage. To determine the fee amount, amount is divided by 100, and then multiplied by the TotalPrice and TotalTaxAmount of the associated OrderItemSummary, prorated for the quantity being returned. PercentageGross —Value of amount is a percentage. To determine the fee amount, amount is divided by 100, and then multiplied by the TotalLineAmountWithTax of the associated OrderItemSummary, prorated for the quantity being returned. ProductOnly —Value of amount is the product-only adjustment only. Available in version 65.0 and later.
   */
  global String amountType;

  /**
   * Description of the fee.
   */
  global String description;

  /**
   * ID of the product representing the fee.
   */
  global String product2Id;

  /**
   * Reason for the fee. The value must match an entry in the ReturnOrderLineItem object’s ReasonForReturn picklist.
   */
  global String reason;

}