/**
 * Delete intent for the social post.
 */
global class DeleteSocialPostIntent {

  global DeleteSocialPostIntent() {}

  /**
   * ID of the social account that deletes the social post.
   */
  global String socialAccountId;

  /**
   * ID of the social post to delete.
   */
  global String socialPostId;

  global Object clone() {}

}