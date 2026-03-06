/**
 * The representation of individual payment credit items. Each item represents a specific payment method and the amount of credit to be applied to it.
 */
global class PaymentCreditSequenceItemOutputRepresentation {

  /**
   * The type of payment credit that is being issued. Must be a valid value on the Credit Type picklist.
   */
  global String creditType;

}