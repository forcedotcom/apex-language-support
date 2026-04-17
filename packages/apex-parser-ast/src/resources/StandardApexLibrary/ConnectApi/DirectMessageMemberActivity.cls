/**
 * Direct message member activity.
 */
global class DirectMessageMemberActivity {

  /**
   * Direct message member activity date.
   */
  global Datetime activityDate;

  /**
   * User who changed the direct message membership.
   */
  global ConnectApi.UserSummary actor;

  /**
   * Members added to the direct message as part of the activity.
   */
  global ConnectApi.DirectMessageMemberPage membersAdded;

  /**
   * Members removed from the direct message as part of the activity.
   */
  global ConnectApi.DirectMessageMemberPage membersRemoved;

}