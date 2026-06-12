/**
 * Contains the result of a verification challenge that you invoke when you create your own Verify page. The challenge can be initiated by either the System.UserManagement.verifyPasswordlessLogin or System.UserManagement.verifySelfRegistration method.
 */
global class VerificationResult {

  global VerificationResult(System.PageReference redirect, Boolean success, String message) {}

  global String message;

  global System.PageReference redirect;

  global Boolean success;

  /**
   * Duplicates the Auth.VerificationResult object.
   * @return Object
   */
  global Object clone() {}

}