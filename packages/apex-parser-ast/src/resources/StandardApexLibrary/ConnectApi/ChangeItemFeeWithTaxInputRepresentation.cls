/**
 * Input representation of a change item fee with taxes.
 */
global class ChangeItemFeeWithTaxInputRepresentation {

  /**
   * Positive value used to calculate the fee amount.
   */
  global Double amount;

  /**
   * List of taxes associated with the change item fees.
   */
  global List < ConnectApi.ChangeItemFeeTaxInputRepresentation > changeItemFeeTaxes;

  /**
   * Description of the fee.
   */
  global String description;

  /**
   * ID of the order delivery group summary.
   */
  global String orderDeliveryGroupSummaryId;

  /**
   * ID of the price book entry associated with the fee product.
   */
  global String priceBookEntryId;

  /**
   * ID of the product representing the fee.
   */
  global String product2Id;

  /**
   * Reason for the cancellation. The value must match one of the picklist values on the Reason field of the Order Product Summary Change object.
   */
  global String reasonText;

}