/**
 * A page of groups that a user is a member of.
 */
global class UserGroupDetailPage {

  /**
   * URL to the current page.
   */
  global String currentPageUrl;

  /**
   * Collection of groups that the user is a member of.
   */
  global List < ConnectApi.ChatterGroupDetail > groups;

  /**
   * URL to the next page, or null if there is no next page.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page, or null if there is no previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of groups that the user is a member of.
   */
  global Integer total;

}