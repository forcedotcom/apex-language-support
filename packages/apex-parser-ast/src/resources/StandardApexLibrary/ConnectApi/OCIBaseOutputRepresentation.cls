/**
 * Base Omnichannel Inventory output class.
 */
global class OCIBaseOutputRepresentation {

  /**
   * Any errors that were returned.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * Indicates whether the request was successful.
   */
  global Boolean success;

}