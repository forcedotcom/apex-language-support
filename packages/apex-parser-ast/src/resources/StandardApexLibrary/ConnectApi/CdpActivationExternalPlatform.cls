/**
 * Get Data 360 activation external platforms.
 */
global class CdpActivationExternalPlatform {

  global CdpActivationExternalPlatform() {}

  public static ConnectApi.ActivationExternalPlatformCollection getActivationExternalPlatforms() {}

  public static ConnectApi.ActivationExternalPlatformCollection getActivationExternalPlatformsPaginated(Integer limit, Integer offset, String orderBy) {}

  global Object clone() {}

}