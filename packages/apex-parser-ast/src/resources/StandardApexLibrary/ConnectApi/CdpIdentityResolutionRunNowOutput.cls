/**
 * Identity resolution ruleset run now output.
 */
global class CdpIdentityResolutionRunNowOutput {

  /**
   * Result of an identity resolution ruleset job run. Values are: ExceededMaximumNumberOfSuccessfulRunsAllowedIn24Hours IdentityResolutionJobIsAlreadyRunning NoPendingChangesJobRunSkipped SuccessfullySubmittedIdentityResolutionJobRunRequest
   */
  global ConnectApi.CdpIdentityResolutionRunNowResultCode resultCode;

}