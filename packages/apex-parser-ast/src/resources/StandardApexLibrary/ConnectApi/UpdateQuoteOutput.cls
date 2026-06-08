/**
 * Representation of the quote update response.
 */
global class UpdateQuoteOutput {

  global UpdateQuoteOutput() {}

  /**
   * Detailed error message if the update quote operation was unsuccessful.
   */
  global List < ConnectApi.ErrorResponse > errors;

  global Object clone() {}

}