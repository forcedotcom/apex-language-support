/**
 * A social account on a social network.
 */
global class SocialAccount {

  /**
   * ID of the external social account, if available.
   */
  global String externalSocialAccountId;

  /**
   * Social handle, screen name, or alias that identifies this account.
   */
  global String handle;

  /**
   * Name of the account as defined by the account's owner.
   */
  global String name;

  /**
   * URL to the account's profile.
   */
  global String profileUrl;

  /**
   * ID of the social persona account, if the external social account ID isn’t available.
   */
  global String socialPersonaId;

}