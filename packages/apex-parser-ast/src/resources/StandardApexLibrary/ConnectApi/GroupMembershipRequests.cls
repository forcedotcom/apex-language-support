/**
 * Requests to become group members.
 */
global class GroupMembershipRequests {

  global GroupMembershipRequests() {}

  /**
   * Information about group membership requests.
   */
  global List < ConnectApi.GroupMembershipRequest > requests;

  /**
   * The total number of requests.
   */
  global Integer total;

  global Object clone() {}

}