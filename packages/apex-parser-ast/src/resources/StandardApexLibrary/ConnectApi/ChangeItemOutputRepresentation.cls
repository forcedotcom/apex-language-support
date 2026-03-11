/**
 * The financial changes resulting from a change to one or more OrderItemSummaries. Most of the values represent the deltas of the values on the associated OrderSummary. The sign of each value is the opposite of the corresponding value on a change order record. For example, a discount is a positive value here and a negative value on a change order record.
 */
global class ChangeItemOutputRepresentation {

  /**
   * Change to the GrandTotalAmount field.
   */
  global Double grandTotalAmount;

  /**
   * Change to the TotalAdjDeliveryAmtWithTax field.
   */
  global Double totalAdjDeliveryAmtWithTax;

  /**
   * Change to the TotalAdjDistAmountWithTax field.
   */
  global Double totalAdjDistAmountWithTax;

  /**
   * Change to the TotalAdjProductAmtWithTax field.
   */
  global Double totalAdjProductAmtWithTax;

  /**
   * Change to the TotalAdjustedDeliveryAmount field.
   */
  global Double totalAdjustedDeliveryAmount;

  /**
   * Change to the TotalAdjustedDeliveryTaxAmount field.
   */
  global Double totalAdjustedDeliveryTaxAmount;

  /**
   * Change to the TotalAdjustedProductAmount field.
   */
  global Double totalAdjustedProductAmount;

  /**
   * Change to the TotalAdjustedProductTaxAmount field.
   */
  global Double totalAdjustedProductTaxAmount;

  /**
   * Change to the TotalAdjustmentDistributedAmount field.
   */
  global Double totalAdjustmentDistributedAmount;

  /**
   * Change to the TotalAdjustmentDistributedTaxAmount field.
   */
  global Double totalAdjustmentDistributedTaxAmount;

  /**
   * Change to the TotalAmount field.
   */
  global Double totalAmount;

  /**
   * Amount of excess funds available on the OrderPaymentSummaries related to the OrderSummary. It is equal to the captured amount that is owed as a refund but is not associated with an invoice or credit memo. Excess funds normally occur when order items are canceled before fulfillment but after payment has been captured. This situation is not common in the US, where funds are normally authorized but not captured until the fulfillment process begins. This value includes all current excess funds related to the OrderSummary, not only the funds related to the current change.
   */
  global Double totalExcessFundsAmount;

  /**
   * Total amount of the fees charged for the change.
   */
  global Double totalFeeAmount;

  /**
   * Total amount of tax on the fees charged for the change.
   */
  global Double totalFeeTaxAmount;

  /**
   * Total amount available to be refunded. It is the sum of the excess funds and any outstanding change order grand total amounts that apply to post-fulfillment changes. This value includes all current refundable amounts related to the OrderSummary, not only the amount related to the current change.
   */
  global Double totalRefundableAmount;

  /**
   * The required funds associated with added order items.
   */
  global Double totalRequiredFundsAmount;

  /**
   * Change to the TotalTaxAmount field.
   */
  global Double totalTaxAmount;

}