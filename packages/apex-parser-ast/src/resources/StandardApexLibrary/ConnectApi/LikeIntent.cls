/**
 * Like intent for a social post.
 */
global class LikeIntent {

  /**
   * Specifies whether the managed social account liked the social post ( true ) or not ( false ).
   */
  global Boolean isLiked;

  /**
   * Managed social account that likes the social post.
   */
  global ConnectApi.ManagedSocialAccount managedSocialAccount;

}