/**
 * The status of a social post.
 */
global class SocialPostStatus {

  global SocialPostStatus() {}

  /**
   * Status message.
   */
  global String message;

  /**
   * Status type. Values are: ApprovalPending ApprovalRecalled ApprovalRejected Deleted Failed Hidden Pending Sent Unknown
   */
  global ConnectApi.SocialPostStatusType type;

  global Object clone() {}

}