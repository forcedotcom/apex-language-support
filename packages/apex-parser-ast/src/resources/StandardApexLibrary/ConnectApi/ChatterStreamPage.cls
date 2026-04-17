/**
 * A collection of Chatter feed streams.
 */
global class ChatterStreamPage {

  /**
   * URL to the current page of streams.
   */
  global String currentPageUrl;

  /**
   * List of streams.
   */
  global List < ConnectApi.ChatterStream > items;

  /**
   * URL to the next page of streams. In version 39.0, all streams are included in currentPageUrl and nextPageUrl is null .
   */
  global String nextPageUrl;

  /**
   * Total number of streams in the collection.
   */
  global Integer total;

}