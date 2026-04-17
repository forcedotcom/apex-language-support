/**
 * Input representation of taxes associated with a change item fee.
 */
global class ChangeItemFeeTaxInputRepresentation {

  /**
   * Tax amount of the change item fee.
   */
  global Double amount;

  /**
   * Description of the change item fee.
   */
  global String description;

  /**
   * Tax rate for the change item fee.
   */
  global Double rate;

  /**
   * Effective date for the tax.
   */
  global String taxEffectiveDate;

  /**
   * Describes how the fee amount is calculated. Valid values are: Actual Estimated
   */
  global String type;

}