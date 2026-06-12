/**
 * Get Data 360 activation external platforms.
 */
global class CdpActivationExternalPlatform {

  global CdpActivationExternalPlatform() {}

  global static ConnectApi.ActivationExternalPlatformCollection getActivationExternalPlatforms() {}

  global static ConnectApi.ActivationExternalPlatformCollection getActivationExternalPlatformsPaginated(Integer limit, Integer offset, String orderBy) {}

  global Object clone() {}

}