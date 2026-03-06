/**
 * Include an @mention of a user or group in a feed post or comment. When creating a feed post or comment, you can include up to 25 mentions.
 */
global class MentionSegmentInput {

  /**
   * ID of the user or group to mention. To mention a user, use either id or username . You can’t include both. To mention a group, you must use id .
   */
  global String id;

  /**
   * User name of the user to mention. To mention a user, use either id or username . You can’t include both.
   */
  global String username;

}