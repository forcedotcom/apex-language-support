/**
 * A page of direct message member activities.
 */
global class DirectMessageMemberActivityPage {

  /**
   * Collection of direct message member activities.
   */
  global List < ConnectApi.DirectMessageMemberActivity > activities;

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

}