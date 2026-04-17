/**
 * An entity that can have feeds associated with it.
 */
global class FeedEnabledEntity {

  /**
   * The 18-character ID of the record.
   */
  global String id;

  /**
   * Small, medium, and large icons indicating the record's type.
   */
  global ConnectApi.Motif motif;

  /**
   * The localized name of the record.
   */
  global String name;

  /**
   * The type of the record.
   */
  global String type;

  /**
   * URL to the record.
   */
  global String url;

}