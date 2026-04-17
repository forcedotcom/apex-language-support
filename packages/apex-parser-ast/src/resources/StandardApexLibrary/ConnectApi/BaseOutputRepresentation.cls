/**
 * Base Order Management output class.
 */
global class BaseOutputRepresentation {

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * Indicates whether the transaction was successful.
   */
  global Boolean success;

}