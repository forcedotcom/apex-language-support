/**
 * Represents a Datacloud order.
 */
global class DatacloudOrder {

  /**
   * URL to a list of contacts or companies that were purchased with this order.
   */
  global String entityUrl;

  /**
   * Unique number that’s used to track your order information.
   */
  global String id;

  /**
   * Number of contacts or companies that were purchased for this order.
   */
  global Integer purchaseCount;

  /**
   * Purchase date for this order.
   */
  global Datetime purchaseDate;

  /**
   * GET request URL for this order.
   */
  global String url;

}