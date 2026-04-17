/**
 * Page of users.
 */
global class UserPage {

  /**
   * Token identifying the current page.
   */
  global Integer currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global Integer nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page, or null if there isn’t a previous page.
   */
  global Integer previousPageToken;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * List of user detail information. If the context user doesn’t have permission to see a property, the property is set to null .
   */
  global List < ConnectApi.UserDetail > users;

}