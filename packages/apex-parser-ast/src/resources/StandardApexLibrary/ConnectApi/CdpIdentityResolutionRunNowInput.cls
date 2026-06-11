/**
 * Input representation for running an identity resolution ruleset job on demand.
 */
global class CdpIdentityResolutionRunNowInput {

  global CdpIdentityResolutionRunNowInput() {}

  /**
   * Calling application.
   */
  global String callingApp;

  /**
   * Calling application information.
   */
  global String callingAppInfo;

  global Object clone() {}

}