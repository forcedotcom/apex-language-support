/**
 * List of social post ids and the action to approve or reject publishing them.
 */
global class SocialPostMassApprovalInput {

  /**
   * Specifies whether to approve ( true ) or reject ( false ) publishing the social posts. If unspecified, defaults to false .
   */
  global Boolean isApproved;

  /**
   * A list of up to 200 social post IDs.
   */
  global List < String > socialPostIdList;

}