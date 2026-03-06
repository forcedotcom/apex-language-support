/**
 * Hide intent for a social post.
 */
global class HideSocialPostIntent {

  /**
   * Specifies whether the managed social account hid the social post ( true ) or not ( false ).
   */
  global Boolean isHidden;

  /**
   * Managed social account that hides the social post.
   */
  global ConnectApi.ManagedSocialAccount managedSocialAccount;

}