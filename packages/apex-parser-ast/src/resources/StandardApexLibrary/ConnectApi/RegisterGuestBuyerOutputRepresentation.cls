/**
 * Indicates success or failure of a register guest buyer action.
 */
global class RegisterGuestBuyerOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * Indicates whether the transaction was successful.
   */
  global Boolean success;

}