/**
 * A Chatter feed stream.
 */
global class ChatterStream {

  /**
   * Experience Cloud site where the stream is.
   */
  global ConnectApi.CommunitySummary community;

  /**
   * Date the stream was created.
   */
  global Datetime createdDate;

  /**
   * Description of the stream.
   */
  global String description;

  /**
   * 18-character ID of the stream.
   */
  global String id;

  /**
   * Name of the stream.
   */
  global String name;

  /**
   * List of entities whose feeds are included in the stream.
   */
  global List < ConnectApi.FeedEnabledEntity > subscriptions;

  /**
   * URL to the stream.
   */
  global String url;

}