/**
 * Indicates success or failure of a register guest buyer action.
 */
global class RegisterGuestBuyerOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global RegisterGuestBuyerOutputRepresentation() {}

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * Indicates whether the transaction was successful.
   */
  global Boolean success;

  global Object clone() {}

}