/**
 * Like intent on a social post.
 */
global class LikeSocialPostIntent {

  global LikeSocialPostIntent() {}

  /**
   * ID of the social account that likes the social post.
   */
  global String socialAccountId;

  /**
   * ID of the social post to like.
   */
  global String socialPostId;

  global Object clone() {}

}