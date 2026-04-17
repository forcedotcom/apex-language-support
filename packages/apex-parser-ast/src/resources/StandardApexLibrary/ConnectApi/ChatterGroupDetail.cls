/**
 * Chatter group details.
 */
global class ChatterGroupDetail extends ConnectApi.ChatterGroup {

  /**
   * The number of files posted to the group.
   */
  global Integer fileCount;

  /**
   * Describes the Information section of the group. If the group is private, this section is visible only to members. If the context user is not a member of the group or does not have Modify All Data or View All Data permission, this value is null .
   */
  global ConnectApi.GroupInformation information;

  /**
   * The number of requests to join a group that are in a pending state.
   */
  global Integer pendingRequests;

}