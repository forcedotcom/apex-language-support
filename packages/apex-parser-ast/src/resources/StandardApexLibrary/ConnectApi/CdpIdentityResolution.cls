/**
 * Create, delete, get, run, and update Data 360 identity resolution rulesets.
 */
global class CdpIdentityResolution {

  public static ConnectApi.CdpIdentityResolutionOutput createIdentityResolution(ConnectApi.CdpIdentityResolutionConfigInput input) {}

  public static void deleteIdentityResolution(String identityResolution) {}

  public static ConnectApi.CdpIdentityResolutionOutput getIdentityResolution(String identityResolution) {}

  public static ConnectApi.CdpIdentityResolutionsOutput getIdentityResolutions() {}

  public static ConnectApi.CdpIdentityResolutionRunNowOutput runIdentityResolutionNow(String identityResolution, ConnectApi.CdpIdentityResolutionRunNowInput input) {}

  public static ConnectApi.CdpIdentityResolutionOutput updateIdentityResolution(String identityResolution, ConnectApi.CdpIdentityResolutionConfigPatchInput input) {}

}