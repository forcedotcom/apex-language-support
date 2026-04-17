/**
 * Order Payment Summary ID, credit amount, and credit type for individual payment credit items. Each item represents a specific payment method and the amount of credit to be applied to it with the type of credit transaction.
 */
global class PaymentCreditSequenceItemInputRepresentation {

  /**
   * The type of payment credit that will be issued. Must be a valid value on the Credit Type picklist.
   */
  global String creditType;

}