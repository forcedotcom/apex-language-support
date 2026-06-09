/**
 * Create, delete, get, run, and update Data 360 identity resolution rulesets.
 */
global class CdpIdentityResolution {

  global CdpIdentityResolution() {}

  global static ConnectApi.CdpIdentityResolutionOutput createIdentityResolution(ConnectApi.CdpIdentityResolutionConfigInput input) {}

  global static void deleteIdentityResolution(String identityResolution) {}

  global static ConnectApi.CdpIdentityResolutionOutput getIdentityResolution(String identityResolution) {}

  global static ConnectApi.CdpIdentityResolutionsOutput getIdentityResolutions() {}

  global static ConnectApi.CdpIdentityResolutionRunNowOutput runIdentityResolutionNow(String identityResolution, ConnectApi.CdpIdentityResolutionRunNowInput input) {}

  global static ConnectApi.CdpIdentityResolutionOutput updateIdentityResolution(String identityResolution, ConnectApi.CdpIdentityResolutionConfigPatchInput input) {}

  global Object clone() {}

}