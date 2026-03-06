/**
 * A collection of direct message members.
 */
global class DirectMessageMemberPage {

  /**
   * Page token to access the current page of direct message members.
   */
  global String currentPageToken;

  /**
   * URL to the current page of direct message members.
   */
  global String currentPageUrl;

  /**
   * Page token to access the next page of direct message members.
   */
  global String nextPageToken;

  /**
   * URL to the next page of direct message members.
   */
  global String nextPageUrl;

  /**
   * Collection of direct message members.
   */
  global List < ConnectApi.UserSummary > users;

}