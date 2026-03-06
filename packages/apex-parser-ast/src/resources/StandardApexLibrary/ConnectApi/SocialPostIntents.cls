/**
 * Intents available for a social post.
 */
global class SocialPostIntents {

  /**
   * Approval intent for the social post.
   */
  global ConnectApi.ApprovalIntent approvalIntent;

  /**
   * Delete intents for the social post.
   */
  global ConnectApi.DeleteIntents deleteIntent;

  /**
   * Follow intents for the social persona.
   */
  global ConnectApi.FollowIntents followIntent;

  /**
   * Hide intent for the social post.
   */
  global ConnectApi.HideSocialPostIntent hideIntent;

  /**
   * Like intents for the social post.
   */
  global ConnectApi.LikeIntents likeIntent;

  /**
   * Reply intents for the social post.
   */
  global ConnectApi.ReplyIntents replyIntent;

}