/**
 * Page of zones.
 */
global class ZonePage {

  /**
   * A list of one or more zones.
   */
  global List < ConnectApi.Zone > zones;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

}