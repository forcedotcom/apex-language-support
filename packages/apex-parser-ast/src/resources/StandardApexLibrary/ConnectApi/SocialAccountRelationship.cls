/**
 * Follow relationship between a managed social account and a social persona.
 */
global class SocialAccountRelationship {

  /**
   * Specifies whether the social account is followed by the social persona.
   */
  global Boolean isFollowed;

  /**
   * Specifies whether the social account is following the social persona.
   */
  global Boolean isFollowing;

  /**
   * ID of the social account.
   */
  global String socialAccountId;

  /**
   * ID of the social persona.
   */
  global String socialPersonaId;

}