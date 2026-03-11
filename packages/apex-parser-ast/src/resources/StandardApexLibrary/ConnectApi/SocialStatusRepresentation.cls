/**
 * Status response for Webstore Meta Config entity creation.
 */
global class SocialStatusRepresentation {

  /**
   * Detailed error message if the operation was unsuccessful.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Specifies whether the operation was successful ( true ) or not ( false ).
   */
  global Boolean isSuccess;

}