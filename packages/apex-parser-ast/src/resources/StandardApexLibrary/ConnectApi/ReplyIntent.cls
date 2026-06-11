/**
 * Reply intent for a social post.
 */
global class ReplyIntent {

  global ReplyIntent() {}

  /**
   * Managed social account that replies to the social post.
   */
  global ConnectApi.ManagedSocialAccount managedSocialAccount;

  global Object clone() {}

}