/**
 * Member of a group.
 */
global class GroupMember {

  /**
   * User’s 18-character ID.
   */
  global String id;

  /**
   * The date and time at which the group member last accessed the group feed.
   */
  global Datetime lastFeedAccessDate;

  /**
   * Type of membership the user has with the group. GroupOwner GroupManager NotAMember NotAMemberPrivateRequested StandardMember
   */
  global ConnectApi.GroupMembershipType Enum role;

  /**
   * Connect REST API URL to this membership.
   */
  global String url;

  /**
   * Information about the user who is subscribed to this group.
   */
  global ConnectApi.UserSummary user;

}