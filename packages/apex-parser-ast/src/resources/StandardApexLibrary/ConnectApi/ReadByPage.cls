/**
 * A collection of information about who read the feed element and when.
 */
global class ReadByPage {

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page. The default is 25 items per page.
   */
  global String currentPageUrl;

  /**
   * Collection of read-by information, including users and when they last read the feed element.
   */
  global List < ConnectApi.ReadBy > items;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Reserved for future use.
   */
  global String previousPageToken;

  /**
   * Reserved for future use.
   */
  global String previousPageUrl;

  /**
   * Total number of users who read the feed element. Note This count appears in the UI under feed posts in private and unlisted Chatter groups as the “seen by” number, for example, “Seen by 48.”
   */
  global Integer total;

}