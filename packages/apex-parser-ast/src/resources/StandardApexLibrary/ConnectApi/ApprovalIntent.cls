/**
 * Approval intent for a social post.
 */
global class ApprovalIntent {

  global ApprovalIntent() {}

  /**
   * Specifies whether the social post can be recalled ( true ) or not ( false ).
   */
  global Boolean isRecallable;

  global Object clone() {}

}