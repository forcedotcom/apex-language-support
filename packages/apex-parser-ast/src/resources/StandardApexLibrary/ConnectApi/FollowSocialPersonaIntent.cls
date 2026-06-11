/**
 * Follow intent on a social persona.
 */
global class FollowSocialPersonaIntent {

  global FollowSocialPersonaIntent() {}

  /**
   * Managed social account that follows the social persona.
   */
  global ConnectApi.ManagedSocialAccount managedSocialAccount;

  /**
   * ID of the social persona to follow.
   */
  global String socialPersonaId;

  global Object clone() {}

}