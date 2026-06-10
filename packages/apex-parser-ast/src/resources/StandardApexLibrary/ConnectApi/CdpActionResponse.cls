/**
 * Customer Data Platform action response.
 */
global class CdpActionResponse {

  global CdpActionResponse() {}

  /**
   * List of errors that resulted from the action.
   */
  global List < ConnectApi.CdpErrorResponse > errors;

  /**
   * Indicates whether the call was successful ( true ) or not ( false ).
   */
  global Boolean success;

  global Object clone() {}

}