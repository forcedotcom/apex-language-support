/**
 * A collection of announcements.
 */
global class AnnouncementPage {

  /**
   * A collection of ConnectApi.Announcement objects.
   */
  global List < ConnectApi.Announcement > announcements;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

}