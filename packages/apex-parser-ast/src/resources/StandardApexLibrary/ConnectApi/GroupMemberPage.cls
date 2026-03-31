/**
 * Page of group members.
 */
global class GroupMemberPage {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of group members.
   */
  global List < ConnectApi.GroupMember > members;

  /**
   * If the context user is a member of this group, returns information about that membership, otherwise, null .
   */
  global ConnectApi.Reference myMembership;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of group members across all pages.
   */
  global Integer totalMemberCount;

}