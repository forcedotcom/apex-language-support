/**
 * A paginated list of groups the context user is a member of.
 */
global class UserGroupPage {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of groups.
   */
  global List < ConnectApi.ChatterGroupSummary > groups;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of groups across all pages.
   */
  global Integer total;

}