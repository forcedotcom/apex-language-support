/**
 * A price adjustment to an OrderItemSummary. It only supports discounts, not increases.
 */
global class AdjustItemInputRepresentation {

  /**
   * Describes how the amount is calculated. It can have one of these values: AmountTaxOnly —Value of amount is the tax-only adjustment only. Available in version 65.0 and later. AmountWithTax —Value of amount is the adjustment, including tax. AmountWithoutTax —Value of amount is the adjustment, not including tax. Tax is calculated on the value and added. Percentage —Value of amount is a percentage discount. It is divided by 100, and then multiplied by the TotalPrice and TotalTaxAmount of the OrderItemSummary to determine the adjustment amount. ProductOnly ——Value of amount is the product-only adjustment only. Available in version 65.0 and later.
   */
  global String adjustmentType;

  /**
   * Value used to calculate the adjustment amount, as described by the adjustmentType. It must be a negative value.
   */
  global Double amount;

  /**
   * Description of the adjustment.
   */
  global String description;

  /**
   * ID of the OrderItemSummary.
   */
  global String orderItemSummaryId;

  /**
   * Reason for the adjustment. The value must match one of the picklist values on the Reason field of the OrderItemSummaryChange object.
   */
  global String reason;

}